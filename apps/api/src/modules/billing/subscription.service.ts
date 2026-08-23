import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Lesson } from "../lesson-plans/entities/lesson.entity";
import { BillingService } from "./billing.service";

/**
 * Бесплатный доступ при первой регистрации — оферта, п. 4.1.
 *
 * Меряется КОМПЛЕКТАМИ учебных материалов, а не днями: пробный период по
 * времени убран, потому что договор обещает объём, а не срок. Один комплект =
 * один урок, для которого запущена генерация плана; все производные материалы
 * этого урока (раздатки, презентация, перегенерация этапов) входят в тот же
 * комплект и остаются доступны после исчерпания лимита.
 */
export const TRIAL_LESSON_LIMIT = 5;

/**
 * SubscriptionGuard висит не только на маршрутах уроков (ещё generators, kmzh,
 * materials), поэтому параметр :id может оказаться чем угодно. Запрос
 * `where: { id }` по uuid-колонке с не-uuid значением роняет Postgres ошибкой
 * 22P02, а не возвращает пустой результат — отсюда проверка формата.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly billingService: BillingService,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
  ) {}

  /** Оплаченная подписка, действующая прямо сейчас. */
  private async hasPaidAccess(teacherId: string): Promise<boolean> {
    const now = new Date();
    const subscription = await this.billingService.getSubscription(teacherId);
    if (!subscription) return false;

    return (
      subscription.status === "active" &&
      subscription.currentPeriodEnd != null &&
      subscription.currentPeriodEnd > now
    );
  }

  /** Сколько комплектов бесплатного доступа уже израсходовано. */
  async trialLessonsUsed(teacherId: string): Promise<number> {
    return this.lessonRepo.count({
      where: { userId: teacherId, trialCounted: true },
    });
  }

  /** Сколько комплектов осталось (0, если лимит исчерпан). */
  async trialLessonsLeft(teacherId: string): Promise<number> {
    const used = await this.trialLessonsUsed(teacherId);
    return Math.max(0, TRIAL_LESSON_LIMIT - used);
  }

  /**
   * Есть ли доступ к AI-операции. Используется SubscriptionGuard.
   *
   * `lessonId` — урок, над которым идёт операция. Если он уже израсходовал
   * комплект, доступ есть независимо от остатка: иначе учитель создал бы 5
   * планов и не смог доделать к ним раздатки, а комплект по оферте — это
   * полный набор материалов, а не один только план.
   */
  async checkSubscriptionAccess(
    teacherId: string,
    lessonId?: string | null,
  ): Promise<boolean> {
    if (await this.hasPaidAccess(teacherId)) return true;

    if (lessonId && UUID_RE.test(lessonId)) {
      const counted = await this.lessonRepo.count({
        where: { id: lessonId, userId: teacherId, trialCounted: true },
      });
      if (counted > 0) return true;
    }

    return (await this.trialLessonsUsed(teacherId)) < TRIAL_LESSON_LIMIT;
  }
}
