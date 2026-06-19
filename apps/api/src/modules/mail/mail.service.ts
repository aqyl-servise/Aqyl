import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { SmsService } from "../notifications/sms.service";

type Lang = "ru" | "kz" | "en";

interface ResetI18n {
  htmlLang: string;
  subtitle: string;
  heading: string;
  body: (email: string) => string;
  btnText: string;
  validityNote: string;
  manualLink: string;
  footer: string;
  subject: string;
  plain: (url: string) => string;
}

function getResetI18n(lang: Lang): ResetI18n {
  switch (lang) {
    case "kz":
      return {
        htmlLang: "kk",
        subtitle: "Цифрлық мектеп",
        heading: "Құпия сөзді қалпына келтіру",
        body: (email) =>
          `Біз <strong>${email}</strong> аккаунтыңыздың құпия сөзін қалпына келтіру сұрауын алдық. Жаңа құпия сөз жасау үшін төмендегі түймені басыңыз.`,
        btnText: "Құпия сөзді қалпына келтіру",
        validityNote: "Сілтеме <strong>1 сағат</strong> бойы жарамды. Егер сіз сұраныс жібермеген болсаңыз — бұл хатты елемеңіз.",
        manualLink: "Немесе сілтемені қолмен кірістіріңіз:",
        footer: "© 2026 Aqyl — Цифрлық мектеп",
        subject: "Құпия сөзді қалпына келтіру — Aqyl",
        plain: (url) => `Құпия сөзді қалпына келтіру\n\nСілтемеге өтіңіз:\n${url}\n\nСілтеме 1 сағат бойы жарамды.`,
      };
    case "en":
      return {
        htmlLang: "en",
        subtitle: "Digital School",
        heading: "Password Reset",
        body: (email) =>
          `We received a request to reset the password for your account <strong>${email}</strong>. Click the button below to create a new password.`,
        btnText: "Reset Password",
        validityNote: "The link is valid for <strong>1 hour</strong>. If you did not request a password reset, simply ignore this email.",
        manualLink: "Or paste the link manually:",
        footer: "© 2026 Aqyl — Digital School",
        subject: "Password Reset — Aqyl",
        plain: (url) => `Password Reset\n\nFollow the link to reset your password:\n${url}\n\nThe link is valid for 1 hour.`,
      };
    default:
      return {
        htmlLang: "ru",
        subtitle: "Цифровая школа",
        heading: "Восстановление пароля",
        body: (email) =>
          `Мы получили запрос на сброс пароля для вашего аккаунта <strong>${email}</strong>. Нажмите кнопку ниже, чтобы создать новый пароль.`,
        btnText: "Сбросить пароль",
        validityNote: "Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.",
        manualLink: "Или вставьте ссылку вручную:",
        footer: "© 2026 Aqyl — Цифровая школа",
        subject: "Восстановление пароля — Aqyl",
        plain: (url) => `Восстановление пароля\n\nДля сброса пароля перейдите по ссылке:\n${url}\n\nСсылка действительна 1 час.`,
      };
  }
}

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly smsService: SmsService,
  ) {
    this.from = config.get<string>("SMTP_FROM") ?? "Aqyl <noreply@aqyl.kz>";

    this.transporter = nodemailer.createTransport({
      host: config.get<string>("SMTP_HOST"),
      port: config.get<number>("SMTP_PORT") ?? 587,
      secure: config.get<number>("SMTP_PORT") === 465,
      auth: {
        user: config.get<string>("SMTP_USER"),
        pass: config.get<string>("SMTP_PASS"),
      },
    });
  }

  async sendPasswordReset(email: string, resetUrl: string, lang: Lang = "ru", phone?: string): Promise<void> {
    const i18n = getResetI18n(lang);
    const html = `
<!DOCTYPE html>
<html lang="${i18n.htmlLang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center">
            <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">✦ Aqyl</span>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">${i18n.subtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b">${i18n.heading}</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">
              ${i18n.body(email)}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td style="background:#2563eb;border-radius:8px">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px">
                    ${i18n.btnText}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5">
              ${i18n.validityNote}
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all">
              ${i18n.manualLink} ${resetUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">${i18n.footer}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2");
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: i18n.subject,
        html,
        text: i18n.plain(resetUrl),
      });
      this.logger.log(`Password reset email sent to ${maskedEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${maskedEmail}`, err);
      throw err;
    }
    if (phone) {
      await this.smsService.sendPasswordReset(phone, resetUrl, lang);
    }
  }

  /** B2C email-verification 6-digit code. */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const html = `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #6B5CE7;">Aqyl</h2>
  <p>Ваш код подтверждения:</p>
  <div style="font-size: 36px; font-weight: bold; color: #6B5CE7; letter-spacing: 8px; margin: 24px 0;">
    ${code}
  </div>
  <p style="color: #666;">Код действителен 15 минут. Не передавайте его никому.</p>
</div>`;

    const maskedEmail = email.replace(/(.{2}).+(@.+)/, "$1***$2");
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: "Aqyl — код подтверждения",
        html,
        text: `Ваш код подтверждения Aqyl: ${code}. Код действителен 15 минут.`,
      });
      this.logger.log(`Verification code email sent to ${maskedEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send verification code email to ${maskedEmail}`, err);
      throw err;
    }
  }
}
