import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { SubscriptionService } from "../../modules/billing/subscription.service";

/**
 * Блокирует AI-эндпоинты для B2C-учителей без активной подписки/триала.
 * B2G-учителя (registrationSource !== 'b2c') проходят без проверки.
 * Ставится ПОСЛЕ JwtAuthGuard, чтобы request.user был заполнен.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    // B2G учителя — пропускаем (оплата по договору, без онлайн-подписки).
    if (user.registrationSource !== "b2c") return true;

    // id урока из маршрута: операции над уроком, уже израсходовавшим комплект,
    // разрешены и после исчерпания лимита (см. SubscriptionService).
    const lessonId = request.params?.id ?? null;

    const hasAccess = await this.subscriptionService.checkSubscriptionAccess(
      user.id,
      lessonId,
    );
    if (!hasAccess) {
      // Текст различает «уроки закончились» и «срок пакета истёк» (ТЗ №3).
      throw new ForbiddenException(
        await this.subscriptionService.denialMessage(user.id),
      );
    }
    return true;
  }
}
