import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Teacher } from '../teachers/entities/teacher.entity';
import { PhoneVerification } from './entities/phone-verification.entity';
import { TrialGuardService } from '../trial-guard/trial-guard.service';
import { SmsService } from '../notifications/sms.service';

/**
 * Подтверждение номера телефона — защита бесплатного доступа от
 * мультиаккаунтов.
 *
 * Почта бесплатна и безлимитна: завёл новый ящик — получил новые пять уроков.
 * Номер телефона так просто не размножишь, поэтому бесплатные комплекты
 * выдаются только на подтверждённый номер, а отпечаток номера переживает
 * удаление аккаунта (TrialGuardService).
 *
 * Номер спрашивается НЕ при регистрации, а при первой генерации: трение
 * попадает туда, где начинается ценность, а не на вход, где отпугивает.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
/** Больше — уже перебор шестизначного кода. */
const MAX_ATTEMPTS = 5;
/** Не чаще одного SMS в минуту на учителя: SMS стоят денег. */
const RESEND_COOLDOWN_MS = 60 * 1000;

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(PhoneVerification) private readonly repo: Repository<PhoneVerification>,
    private readonly trialGuard: TrialGuardService,
    private readonly sms: SmsService,
  ) {}

  /** Казахстанский мобильный: 11 цифр, начинается с 77. */
  private static isValidKzMobile(normalized: string): boolean {
    return /^77\d{9}$/.test(normalized);
  }

  /** Отправить код на номер. Возвращает маскированный номер для интерфейса. */
  async requestCode(teacherId: string, rawPhone: string): Promise<{ phoneMasked: string }> {
    const phone = TrialGuardService.normalizePhone(rawPhone ?? '');
    if (!PhoneVerificationService.isValidKzMobile(phone)) {
      throw new BadRequestException('Укажите казахстанский номер в формате +7 7XX XXX XX XX');
    }

    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (!teacher) throw new BadRequestException('Пользователь не найден');

    // Номер уже подтверждён другим аккаунтом — это и есть тот случай, ради
    // которого всё делалось. Сообщаем прямо, без намёков на чужую учётку.
    const taken = await this.teacherRepo.count({
      where: { phone, phoneVerifiedAt: Not(null as never), id: Not(teacherId) },
    });
    if (taken > 0) {
      throw new BadRequestException('Этот номер уже используется другим аккаунтом');
    }

    const recent = await this.repo.findOne({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw new BadRequestException('Код уже отправлен. Повторить можно через минуту');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Сначала отправка, потом запись: иначе при сбое SMS остаётся запись, и
    // пауза между отправками блокирует повтор — пользователь видит сначала
    // «не удалось отправить», а следом «код уже отправлен, ждите минуту».
    // strict: несостоявшаяся отправка ломает поток, пользователь должен
    // увидеть ошибку, а не пустой экран ввода кода.
    await this.sms.sendSms(phone, `Aqyl: код подтверждения ${code}. Никому его не сообщайте.`, true);

    await this.repo.save(this.repo.create({
      teacherId, phone, code,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    }));
    this.logger.log(`Код подтверждения отправлен учителю ${teacherId} на ${phone.slice(0, 4)}***${phone.slice(-2)}`);

    return { phoneMasked: `+${phone.slice(0, 1)} ${phone.slice(1, 4)} *** ** ${phone.slice(-2)}` };
  }

  /**
   * Проверить код. При успехе номер закрепляется за аккаунтом, а его отпечаток
   * записывается сразу — чтобы следующий аккаунт с тем же номером бесплатных
   * уроков уже не получил (не дожидаясь удаления этого).
   */
  async verifyCode(teacherId: string, rawCode: string): Promise<{ ok: true; trialAllowed: boolean }> {
    const record = await this.repo.findOne({
      where: { teacherId, isUsed: false },
      order: { createdAt: 'DESC' },
    });
    if (!record) throw new BadRequestException('Код не запрашивался. Отправьте код заново');
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Срок действия кода истёк. Отправьте код заново');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Слишком много попыток. Отправьте код заново');
    }

    if (String(rawCode ?? '').trim() !== record.code) {
      await this.repo.update({ id: record.id }, { attempts: record.attempts + 1 });
      throw new BadRequestException('Неверный код');
    }

    const teacher = await this.teacherRepo.findOne({ where: { id: teacherId } });
    if (!teacher) throw new BadRequestException('Пользователь не найден');

    // Выдавать ли бесплатные уроки: если по этому номеру их уже получали
    // (в том числе на удалённом аккаунте) — нет.
    const trialAllowed = await this.trialGuard.shouldGrantTrial(teacher.email, record.phone);

    await this.repo.update({ id: record.id }, { isUsed: true });
    await this.teacherRepo.update({ id: teacherId }, {
      phone: record.phone,
      phoneVerifiedAt: new Date(),
    });
    // Номер «сгорает» сразу при подтверждении, а не при удалении аккаунта:
    // иначе второй аккаунт на тот же номер получил бы свой пробный доступ.
    await this.trialGuard.remember(teacher.email, record.phone);

    this.logger.log(
      `Учитель ${teacherId} подтвердил номер; бесплатные уроки ${trialAllowed ? 'доступны' : 'уже были получены по этому номеру'}`,
    );
    return { ok: true, trialAllowed };
  }
}
