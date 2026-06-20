import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

// TODO: VERIFY_KASPI_DOCS — точную структуру webhook, параметры URL и заголовок
// подписи необходимо сверить с документацией в кабинете мерчанта Kaspi Pay.
// Код написан под типовую структуру REST-интеграции.
@Injectable()
export class KaspiService {
  private readonly logger = new Logger(KaspiService.name);

  constructor(private config: ConfigService) {}

  // Генерация уникального orderId
  generateOrderId(): string {
    return `AQYL-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)
      .toUpperCase()}`;
  }

  // Формирование URL для редиректа на Kaspi
  // TODO: VERIFY_KASPI_DOCS — baseUrl и имена query-параметров получить в кабинете мерчанта.
  buildPaymentUrl(params: {
    orderId: string;
    amount: number; // в тенге, целое число
    description: string;
    returnUrl: string;
    failUrl: string;
  }): string {
    const shopId = this.config.get<string>("KASPI_SHOP_ID") ?? "";
    // URL формируется согласно документации Kaspi Pay
    // https://kaspi.kz/merchantcabinet — получить в кабинете мерчанта
    const baseUrl = "https://pay.kaspi.kz/pay/";
    const queryParams = new URLSearchParams({
      service_id: shopId,
      amount: params.amount.toString(),
      order_id: params.orderId,
      return_url: params.returnUrl,
      fail_url: params.failUrl,
      description: params.description,
    });
    return `${baseUrl}?${queryParams.toString()}`;
  }

  // Верификация подписи webhook от Kaspi
  verifyWebhookSignature(body: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>("KASPI_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn(
        "KASPI_WEBHOOK_SECRET not set — skipping signature check",
      );
      return true; // в dev режиме пропускаем
    }
    if (!signature) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    // timingSafeEqual бросает, если длины различаются — защищаемся заранее.
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  }

  // Парсинг webhook payload от Kaspi
  // TODO: VERIFY_KASPI_DOCS — реальные имена полей и значения статусов уточнить в кабинете.
  parseWebhookPayload(body: Record<string, unknown>): {
    orderId: string;
    externalId: string;
    amount: number;
    status: "paid" | "failed";
  } {
    return {
      orderId: body.order_id as string,
      externalId: body.transaction_id as string,
      amount: Number(body.amount),
      status: body.status === "APPROVED" ? "paid" : "failed",
    };
  }
}
