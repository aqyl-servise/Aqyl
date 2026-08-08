"use client";

import { ACCOUNT_RESTORE_DAYS, PAYMENT_DOCS_YEARS } from "../lib/product";

/**
 * Текст экрана подтверждения удаления аккаунта.
 *
 * Один компонент для обеих точек входа (из профиля и с публичной страницы) —
 * магазины сверяют формулировки, и расхождение между экранами читается как
 * несоответствие. Здесь же зашиты запреты из требований:
 *   — не «заморозить»/«приостановить»/«деактивировать», а «Удалить аккаунт»;
 *   — никаких предложений написать в поддержку;
 *   — никакого обязательного поля «причина удаления»;
 *   — не больше одного дополнительного подтверждения.
 */
export function DeleteAccountConfirmText({ tone = "light" }: { tone?: "light" | "dark" }) {
  const muted = tone === "dark" ? "var(--muted)" : "var(--pub-text-2)";
  const strong = tone === "dark" ? "var(--white)" : "var(--pub-text)";

  const restoreDate = new Date();
  restoreDate.setDate(restoreDate.getDate() + ACCOUNT_RESTORE_DAYS);
  const restoreLabel = restoreDate.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, lineHeight: 1.7, color: muted, fontSize: 15 }}>
      <p style={{ margin: 0 }}>
        <b style={{ color: strong }}>Будут удалены:</b> ваш профиль, все созданные планы уроков,
        задания по функциональной грамотности, презентации, рабочие листы и загруженные файлы.
      </p>
      <p style={{ margin: 0 }}>
        <b style={{ color: strong }}>Будут сохранены:</b> платёжные и бухгалтерские документы по
        совершённым оплатам. Мы обязаны хранить их {PAYMENT_DOCS_YEARS} лет по требованию налогового
        законодательства. Для других целей они не используются.
      </p>
      <p style={{ margin: 0 }}>
        Восстановить аккаунт можно до <b style={{ color: strong }}>{restoreLabel}</b>, войдя с
        прежними почтой и паролем. После этой даты восстановление невозможно.
      </p>
      <p style={{ margin: 0 }}>
        Повторная регистрация на этот же адрес почты или номер телефона не открывает пробный период
        заново.
      </p>
    </div>
  );
}
