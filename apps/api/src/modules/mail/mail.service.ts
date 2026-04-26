import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
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

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center">
            <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">✦ Aqyl</span>
            <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Цифровая школа</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <h2 style="margin:0 0 16px;font-size:20px;color:#1e293b">Восстановление пароля</h2>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6">
              Мы получили запрос на сброс пароля для вашего аккаунта <strong>${email}</strong>.
              Нажмите кнопку ниже, чтобы создать новый пароль.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
              <tr>
                <td style="background:#2563eb;border-radius:8px">
                  <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px">
                    Сбросить пароль
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5">
              Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
            </p>
            <p style="margin:0;color:#94a3b8;font-size:12px;word-break:break-all">
              Или вставьте ссылку вручную: ${resetUrl}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">© 2026 Aqyl — Цифровая школа</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: "Восстановление пароля — Aqyl",
        html,
        text: `Восстановление пароля\n\nДля сброса пароля перейдите по ссылке:\n${resetUrl}\n\nСсылка действительна 1 час.`,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
      throw err;
    }
  }
}
