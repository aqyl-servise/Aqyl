import type { Metadata } from "next";
import { PublicHeader } from "../../components/public-header";
import { PublicFooter } from "../../components/public-footer";
import { COMPANY } from "../../lib/company";
import { ACCOUNT_RESTORE_DAYS, PAYMENT_DOCS_YEARS } from "../../lib/product";

export const metadata: Metadata = {
  title: "Удаление аккаунта | Aqyl",
  description: "Как удалить аккаунт Aqyl и что происходит с данными после удаления.",
};

/**
 * Публичная страница удаления аккаунта.
 *
 * Google Play требует отдельное поле со ссылкой на такую страницу: она должна
 * работать без входа и без установленного приложения. Здесь пока описан
 * порядок и последствия удаления; форма с вводом почты и кодом подтверждения —
 * следующая задача (пункт 1.2 «Удаление аккаунта. Три точки входа»).
 */
export default function DeleteAccountPage() {
  return (
    <div className="aqyl-pub">
      <PublicHeader />

      <section className="pub-section">
        <div className="pub-container" style={{ maxWidth: 760 }}>
          <h1 style={{ marginBottom: 20 }}>Удаление аккаунта</h1>

          <div className="pub-card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10 }}>Что будет удалено</h3>
            <p style={{ lineHeight: 1.75 }}>
              Ваш профиль, все созданные планы уроков, задания по функциональной грамотности,
              презентации, рабочие листы и загруженные файлы.
            </p>
          </div>

          <div className="pub-card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10 }}>Что будет сохранено</h3>
            <p style={{ lineHeight: 1.75 }}>
              Платёжные и бухгалтерские документы по совершённым оплатам. Мы обязаны хранить их{" "}
              {PAYMENT_DOCS_YEARS} лет по требованию налогового законодательства. Для других целей
              они не используются.
            </p>
          </div>

          <div className="pub-card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10 }}>Сроки</h3>
            <p style={{ lineHeight: 1.75 }}>
              Доступ к аккаунту закрывается сразу, подписка не продлевается. В течение{" "}
              {ACCOUNT_RESTORE_DAYS} календарных дней аккаунт можно восстановить, войдя с прежними
              почтой и паролем — пробный период при этом заново не выдаётся. По истечении{" "}
              {ACCOUNT_RESTORE_DAYS} дней профиль, материалы и файлы уничтожаются без возможности
              восстановления.
            </p>
          </div>

          <div className="pub-card">
            <h3 style={{ marginBottom: 10 }}>Как удалить</h3>
            <p style={{ lineHeight: 1.75, marginBottom: 12 }}>
              В приложении и веб-версии: «Профиль» → «Управление аккаунтом» → «Удалить аккаунт».
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--pub-text-3)" }}>
              Форма удаления с этой страницы (без входа в аккаунт) готовится. Вопросы:{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
