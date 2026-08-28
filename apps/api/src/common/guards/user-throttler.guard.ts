import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from "@nestjs/throttler";

/**
 * Ограничитель частоты запросов, считающий по пользователю, а не по адресу.
 *
 * Штатный ThrottlerGuard ведёт счёт по IP. В Казахстане это ломает сервис:
 * мобильные операторы раздают один адрес тысячам абонентов, а школа выходит
 * в сеть через один шлюз. Лимит «три SMS за десять минут» превращался в
 * «три SMS на весь Beeline» — четвёртый учитель получал 429 и не мог
 * подтвердить номер. Именно так мы потеряли большую часть регистраций
 * 26 — 28 августа 2026.
 *
 * Токен проверяется по-настоящему, а не разбирается на глаз: иначе подделка
 * заголовка давала бы злоумышленнику свежий счётчик на каждый запрос и
 * позволяла жечь наш баланс SMS. Аноним и просроченный токен считаются по
 * адресу — для них другого признака нет.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const auth = headers.authorization;
    const raw = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;

    if (raw) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub?: string }>(raw);
        if (payload?.sub) return `user:${payload.sub}`;
      } catch {
        // Просроченный или чужой токен — считаем как анонима по адресу.
      }
    }
    return `ip:${this.clientIp(req, headers)}`;
  }

  /** За nginx настоящий адрес приходит в X-Forwarded-For. */
  private clientIp(
    req: Record<string, unknown>,
    headers: Record<string, string | string[] | undefined>,
  ): string {
    const forwarded = headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    return first || (req.ip as string) || "unknown";
  }

  /**
   * Ответ читает учитель, а не разработчик. Штатный текст —
   * «ThrottlerException: Too Many Requests» — выводился в окне ввода номера
   * как есть.
   */
  protected async getErrorMessage(): Promise<string> {
    return "Слишком много попыток подряд. Подождите пару минут и попробуйте снова.";
  }
}
