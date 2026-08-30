import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as crypto from "crypto";
import { EmailBounce } from "./entities/email-bounce.entity";

/** События Resend, означающие «письмо до человека не дошло». */
const FAILURE_EVENTS = new Set(["email.bounced", "email.complained"]);

/** Разброс часов между нами и отправителем, при котором подпись ещё принимается. */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

interface ResendEvent {
  type?: string;
  data?: { to?: string | string[]; bounce?: { message?: string } };
}

/**
 * Учёт недоставленных писем по уведомлениям Resend.
 *
 * Подпись проверяется вручную (схема Svix), без лишней зависимости: секрет
 * приходит в виде `whsec_<base64>`, подписывается строка `id.timestamp.тело`
 * по сырым байтам запроса.
 */
@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(
    @InjectRepository(EmailBounce) private readonly repo: Repository<EmailBounce>,
  ) {}

  private secret(): string {
    return process.env.RESEND_WEBHOOK_SECRET ?? "";
  }

  /**
   * Проверка подписи вебхука. Без секрета возвращает false — принимать
   * неподписанные уведомления нельзя: иначе кто угодно пометит чужой адрес
   * недоставленным и заблокирует человеку регистрацию.
   */
  verifySignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
    const secret = this.secret();
    if (!secret) {
      this.logger.error("RESEND_WEBHOOK_SECRET не задан — уведомление отклонено");
      return false;
    }

    const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
    const id = one(headers["svix-id"]);
    const timestamp = one(headers["svix-timestamp"]);
    const signature = one(headers["svix-signature"]);
    if (!id || !timestamp || !signature) return false;

    // Защита от повторной отправки перехваченного уведомления.
    const sentAt = Number(timestamp) * 1000;
    if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > TIMESTAMP_TOLERANCE_MS) {
      this.logger.warn("Отклонено: метка времени вне допустимого окна");
      return false;
    }

    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = crypto
      .createHmac("sha256", key)
      .update(`${id}.${timestamp}.${rawBody}`)
      .digest("base64");

    // Заголовок может нести несколько подписей: «v1,<подпись> v1,<подпись>».
    return signature.split(" ").some((part) => {
      const [version, value] = part.split(",");
      if (version !== "v1" || !value) return false;
      const a = Buffer.from(value);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
  }

  /** Записать событие, если оно означает недоставку. */
  async handle(event: ResendEvent): Promise<void> {
    const type = event?.type ?? "";
    if (!FAILURE_EVENTS.has(type)) return;

    const to = event.data?.to;
    const addresses = (Array.isArray(to) ? to : [to]).filter((a): a is string => !!a);
    const reason = event.data?.bounce?.message ?? null;

    for (const address of addresses) {
      const email = address.toLowerCase().trim();
      await this.repo.save(this.repo.create({ email, kind: type, reason }));
      this.logger.warn(`Письмо не доставлено (${type}): ${email}${reason ? ` — ${reason}` : ""}`);
    }
  }

  /**
   * Не дошло ли последнее письмо на этот адрес.
   *
   * Смотрим только на события ПОСЛЕ последнего запроса кода: старый отскок не
   * должен пугать человека, который уже исправил адрес и получил письмо.
   */
  async lastDeliveryFailed(email: string): Promise<{ failed: boolean; reason: string | null }> {
    const address = email.toLowerCase().trim();

    const rows: { createdAt: Date; reason: string | null }[] = await this.repo.query(
      `SELECT b."createdAt", b."reason"
         FROM "email_bounces" b
        WHERE lower(b."email") = $1
          AND b."createdAt" > COALESCE(
                (SELECT max(v."createdAt") FROM "email_verifications" v WHERE lower(v."email") = $1),
                to_timestamp(0))
        ORDER BY b."createdAt" DESC
        LIMIT 1`,
      [address],
    );

    return rows.length
      ? { failed: true, reason: rows[0].reason }
      : { failed: false, reason: null };
  }
}
