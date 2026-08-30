import { Controller, Get, HttpCode, Logger, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { SkipSchoolIsolation } from "../../common/decorators/skip-school-isolation.decorator";
import { EmailDeliveryService } from "./email-delivery.service";

@SkipSchoolIsolation()
@Controller()
export class EmailDeliveryController {
  private readonly logger = new Logger(EmailDeliveryController.name);

  constructor(private readonly delivery: EmailDeliveryService) {}

  /**
   * Уведомления Resend о судьбе письма.
   *
   * Отвечаем 200 всегда, даже на негодную подпись: код ответа виден отправителю
   * и подсказывал бы, угадан ли секрет. Отклонённое уведомление просто не
   * записывается.
   */
  @Post("webhooks/resend")
  @HttpCode(200)
  @Throttle({ short: { limit: 60, ttl: 60_000 }, medium: { limit: 600, ttl: 600_000 } })
  async resendWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body ?? {});

    if (!this.delivery.verifySignature(raw, req.headers)) {
      this.logger.warn("Уведомление Resend с неверной подписью — пропущено");
      return { received: true };
    }

    try {
      await this.delivery.handle(JSON.parse(raw));
    } catch (err) {
      this.logger.error(`Не удалось обработать уведомление: ${(err as Error).message}`);
    }
    return { received: true };
  }

  /**
   * Дошло ли последнее письмо на адрес — для формы регистрации, чтобы вместо
   * бесконечного «код отправлен» показать «письмо не дошло, проверьте адрес».
   */
  @Get("email-delivery/status")
  @Throttle({ short: { limit: 30, ttl: 60_000 } })
  async status(@Query("email") email?: string) {
    if (!email) return { failed: false, reason: null };
    return this.delivery.lastDeliveryFailed(email);
  }
}
