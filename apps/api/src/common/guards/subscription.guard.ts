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

    const hasAccess = await this.subscriptionService.checkSubscriptionAccess(
      user.id,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        "Подписка истекла. Продлите доступ на aqyl-service.kz",
      );
    }
    return true;
  }
}
