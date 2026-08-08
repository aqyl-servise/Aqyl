import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Teacher } from '../teachers/entities/teacher.entity';
import { EmailVerification } from './entities/email-verification.entity';
import { MailService } from '../mail/mail.service';
import { TrialGuardService } from '../trial-guard/trial-guard.service';

/**
 * Удаление аккаунта B2C-учителя.
 *
 * Модель — мягкое удаление с окном восстановления:
 *   немедленно      → доступ закрыт, подписка не продлевается;
 *   в течение 14 дней → вход с прежними данными возвращает аккаунт целиком,
 *                      пробный период при этом заново НЕ выдаётся;
 *   после 14 дней   → профиль, материалы и файлы уничтожаются безвозвратно;
 *                      остаются платёжные документы (5 лет по налоговому
 *                      законодательству) и необратимые отпечатки (см. 1.4).
 *
 * Две точки входа ведут сюда: авторизованная (из профиля, с паролем) и
 * публичная (по коду на почту, без входа и без пароля).
 */

/** Окно восстановления, календарные дни. Должно совпадать с ACCOUNT_RESTORE_DAYS на фронте. */
export const RESTORE_DAYS = 14;

const CODE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(EmailVerification) private readonly verificationRepo: Repository<EmailVerification>,
    private readonly mail: MailService,
    private readonly trialGuard: TrialGuardService,
  ) {}

  private purgeDate(from = new Date()): Date {
    const d = new Date(from);
    d.setDate(d.getDate() + RESTORE_DAYS);
    return d;
  }

  /** Общий шаг: пометить удалённым, отправить письмо. */
  private async markDeleted(teacher: Teacher): Promise<{ purgeAfter: Date }> {
    const now = new Date();
    const purgeAfter = this.purgeDate(now);

    await this.teacherRepo.update(teacher.id, {
      status: 'inactive',
      deletionRequestedAt: now,
      purgeAfter,
      // Подписка не продлевается: снимаем активный статус, но платёжные
      // документы остаются нетронутыми в биллинге.
      subscriptionStatus: 'expired',
    });

    await this.mail.sendAccountDeletion(teacher.email, purgeAfter, RESTORE_DAYS);
    this.logger.log(`Account ${teacher.id} marked for deletion, purge after ${purgeAfter.toISOString()}`);
    return { purgeAfter };
  }

  /**
   * Точка 1 — из профиля. Требуется подтверждение паролем: это единственное
   * дополнительное подтверждение, больше запрашивать нельзя.
   */
  async deleteByPassword(teacherId: string, password: string): Promise<{ purgeAfter: Date }> {
    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (!teacher) throw new BadRequestException('ACCOUNT_NOT_FOUND');

    const matches = await bcrypt.compare(password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException('INVALID_PASSWORD');

    return this.markDeleted(teacher);
  }

  /**
   * Точка 2, шаг 1 — публичная страница: выслать код на почту.
   * Пароль и вход не требуются. Ответ одинаков независимо от того, есть ли
   * такой аккаунт: иначе форма превращается в проверку существования почты.
   */
  async requestCode(rawEmail: string): Promise<{ success: true }> {
    const email = rawEmail.toLowerCase().trim();
    const teacher = await this.teacherRepo.findOne({ where: { email, registrationSource: 'b2c' } });

    if (teacher) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.verificationRepo.save(
        this.verificationRepo.create({
          email,
          code,
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          isUsed: false,
        }),
      );
      await this.mail.sendVerificationCode(email, code);
    }
    return { success: true };
  }

  /** Точка 2, шаг 2 — подтверждение кодом и удаление. */
  async confirmByCode(rawEmail: string, code: string): Promise<{ purgeAfter: Date }> {
    const email = rawEmail.toLowerCase().trim();

    const record = await this.verificationRepo.findOne({
      where: { email, code: code.trim(), isUsed: false },
      order: { createdAt: 'DESC' },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('INVALID_OR_EXPIRED_CODE');
    }

    const teacher = await this.teacherRepo.findOne({ where: { email, registrationSource: 'b2c' } });
    if (!teacher) throw new BadRequestException('ACCOUNT_NOT_FOUND');

    await this.verificationRepo.update(record.id, { isUsed: true });
    return this.markDeleted(teacher);
  }

  /**
   * Восстановление при входе. Вызывается из логина: если аккаунт помечен
   * удалённым, но срок ещё не истёк — снимаем пометку и пускаем.
   * Пробный период заново не выдаётся: trialEndsAt не трогаем.
   */
  async restoreIfPending(teacher: Teacher): Promise<boolean> {
    if (!teacher.deletionRequestedAt || !teacher.purgeAfter) return false;
    if (teacher.purgeAfter.getTime() <= Date.now()) return false;

    await this.teacherRepo.update(teacher.id, {
      status: 'active',
      deletionRequestedAt: null,
      purgeAfter: null,
    });
    this.logger.log(`Account ${teacher.id} restored within the ${RESTORE_DAYS}-day window`);
    return true;
  }

  /**
   * Окончательное уничтожение просроченных аккаунтов. Запускать по расписанию.
   *
   * Порядок важен: сначала записываем необратимый отпечаток (после удаления
   * строки почту взять будет неоткуда), затем чистим материалы и саму запись.
   *
   * Материалы B2C приходится удалять явно: таблицы `lessons` и `literacy_sets`
   * ссылаются на учителя обычной колонкой `userId` БЕЗ внешнего ключа, поэтому
   * каскад их не заденет — без этого шага после удаления аккаунта остались бы
   * осиротевшие планы уроков и задания, а обещание «материалы уничтожаются»
   * оказалось бы ложным. Вложенные записи (`lesson_stages`, `lesson_descriptors`,
   * `literacy_questions`) уходят каскадом от своих родителей.
   *
   * Отдельный случай — `lesson_analysis`: у неё внешний ключ с NO ACTION, то
   * есть СУБД заблокирует удаление учителя, у которого есть анализы уроков.
   * Поэтому чистим и её.
   */
  async purgeDue(): Promise<number> {
    const due = await this.teacherRepo.find({
      where: { purgeAfter: LessThanOrEqual(new Date()), deletionRequestedAt: Not(IsNull()) },
    });
    if (!due.length) return 0;

    let purged = 0;
    for (const teacher of due) {
      try {
        await this.trialGuard.remember(teacher.email, teacher.phone ?? null);

        // Всё в одной транзакции: либо аккаунт исчезает целиком вместе с
        // материалами, либо не меняется ничего и мы повторим на следующий день.
        await this.teacherRepo.manager.transaction(async (tx) => {
          // analyzerId — учитель, проводивший анализ открытого урока.
          await tx.query('DELETE FROM lesson_analysis WHERE "analyzerId" = $1', [teacher.id]);
          await tx.query('DELETE FROM literacy_sets WHERE "userId" = $1', [teacher.id]);
          await tx.query('DELETE FROM lessons WHERE "userId" = $1', [teacher.id]);
          await tx.query('DELETE FROM teacher WHERE id = $1', [teacher.id]);
        });

        purged += 1;
        this.logger.log(`Account ${teacher.id} purged permanently with its materials`);
      } catch (err) {
        // Один проблемный аккаунт не должен останавливать очистку остальных.
        this.logger.error(`Не удалось удалить аккаунт ${teacher.id}: ${(err as Error).message}`);
      }
    }
    return purged;
  }
}
