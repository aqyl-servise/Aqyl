import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type Lang = "ru" | "kz" | "en";

@Injectable()
export class SmsService {
  private readonly apiKey: string;
  private readonly logger = new Logger(SmsService.name);
  private readonly apiUrl = "https://api.mobizon.kz/service/message/sendsmsmessage";

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>("SMS_API_KEY") ?? "";
  }

  /**
   * Отправка SMS через Mobizon.
   *
   * `strict` — для сценариев, где несостоявшаяся отправка ломает поток
   * (подтверждение номера): тогда бросаем ошибку, чтобы пользователь увидел
   * «не удалось отправить код», а не пустой экран ожидания. Уведомления
   * (напоминания, одобрение регистрации) остаются нестрогими: их сбой не
   * должен ронять основную операцию.
   *
   * Mobizon отвечает HTTP 200 и на ошибки — код лежит в теле (code !== 0),
   * поэтому статуса ответа недостаточно.
   */
  async sendSms(phone: string, text: string, strict = false): Promise<void> {
    if (!this.apiKey) {
      this.logger.warn("SMS_API_KEY not configured, skipping SMS");
      if (strict) throw new Error("SMS_NOT_CONFIGURED");
      return;
    }
    const params = new URLSearchParams({ apiKey: this.apiKey, recipient: phone, text, output: "json" });
    const masked = `${phone.slice(0, 5)}***`;
    try {
      const res = await fetch(`${this.apiUrl}?${params.toString()}`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as { code?: number; message?: string } | null;
      if (!res.ok || !body || body.code !== 0) {
        const detail = body?.message ?? `${res.status} ${res.statusText}`;
        this.logger.error(`Mobizon SMS error (${masked}): ${detail}`);
        if (strict) throw new Error("SMS_SEND_FAILED");
        return;
      }
      this.logger.log(`SMS sent to ${masked}`);
    } catch (err) {
      if (strict && err instanceof Error && err.message.startsWith("SMS_")) throw err;
      this.logger.error(`Failed to send SMS to ${masked}`, err);
      if (strict) throw new Error("SMS_SEND_FAILED");
    }
  }

  async sendRegistrationApproved(phone: string, name: string, lang: Lang = "ru"): Promise<void> {
    let text: string;
    switch (lang) {
      case "kz":
        text = `${name}, тіркелуіңіз бекітілді! Aqyl платформасына кіруге болады.`;
        break;
      case "en":
        text = `${name}, your registration has been approved! You can now log in to Aqyl.`;
        break;
      default:
        text = `${name}, ваша регистрация одобрена! Теперь вы можете войти в платформу Aqyl.`;
    }
    await this.sendSms(phone, text);
  }

  async sendPasswordReset(phone: string, resetUrl: string, lang: Lang = "ru"): Promise<void> {
    let text: string;
    switch (lang) {
      case "kz":
        text = `Aqyl: Құпия сөзді қалпына келтіру сілтемесі: ${resetUrl} (1 сағат жарамды)`;
        break;
      case "en":
        text = `Aqyl: Password reset link: ${resetUrl} (valid 1 hour)`;
        break;
      default:
        text = `Aqyl: Ссылка для сброса пароля: ${resetUrl} (действительна 1 час)`;
    }
    await this.sendSms(phone, text);
  }

  async sendLessonReminder(phone: string, lessonInfo: string, lang: Lang = "ru"): Promise<void> {
    let text: string;
    switch (lang) {
      case "kz":
        text = `Aqyl: Сабақ туралы еске салу: ${lessonInfo}`;
        break;
      case "en":
        text = `Aqyl: Lesson reminder: ${lessonInfo}`;
        break;
      default:
        text = `Aqyl: Напоминание об уроке: ${lessonInfo}`;
    }
    await this.sendSms(phone, text);
  }
}
