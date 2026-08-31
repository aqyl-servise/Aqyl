import type { Metadata } from "next";
import { PublicHeader } from "../../../components/public-header";
import { PublicFooter } from "../../../components/public-footer";
import { COMPANY } from "../../../lib/company";
import {
  ACTIVE_RECIPIENTS,
  PLANNED_RECIPIENTS,
  HOSTING,
  type DataRecipient,
} from "../../../lib/data-recipients";

export const metadata: Metadata = {
  title: "Кому передаются данные | Aqyl",
  description: "Перечень получателей персональных данных с указанием страны размещения.",
};

function RecipientTable({ items }: { items: DataRecipient[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem", minWidth: 520 }}>
        <thead>
          <tr>
            {["Получатель", "Страна", "Зачем", "Что передаётся"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left", padding: "10px 12px", borderBottom: "2px solid var(--pub-border)",
                  whiteSpace: "nowrap", fontWeight: 700,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.name}>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--pub-border)", fontWeight: 600 }}>{r.name}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--pub-border)", whiteSpace: "nowrap" }}>{r.country}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--pub-border)" }}>{r.purpose}</td>
              <td style={{ padding: "12px", borderBottom: "1px solid var(--pub-border)", lineHeight: 1.6 }}>{r.data}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <div className="aqyl-pub">
      <PublicHeader />

      <section className="pub-section">
        <div className="pub-container" style={{ maxWidth: 860 }}>
          <h1 style={{ marginBottom: 8 }}>Кому передаются данные</h1>
          <p style={{ color: "var(--pub-text-3)", fontSize: "0.875rem", marginBottom: 28 }}>
            Страница указана в Политике конфиденциальности и в тексте согласия. Перечень
            обновляется при каждом изменении состава получателей.
          </p>

          <h2 style={{ marginBottom: 12 }}>Получают данные сейчас</h2>
          <RecipientTable items={ACTIVE_RECIPIENTS} />

          <div className="pub-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>О передаче за пределы Казахстана</h3>
            <p style={{ lineHeight: 1.75 }}>
              Часть получателей находится за пределами Республики Казахстан. Такая передача
              выполняется только на основании вашего отдельного согласия, которое запрашивается
              при регистрации отдельной отметкой — не вместе с остальными условиями.
            </p>
          </div>

          {PLANNED_RECIPIENTS.length > 0 && (
            <>
              <h2 style={{ marginTop: 36, marginBottom: 8 }}>Подключение планируется</h2>
              <p style={{ marginBottom: 12, lineHeight: 1.75 }}>
                Перечисленным ниже организациям данные <b>пока не передаются</b>. Строки
                перенесутся в таблицу выше в день фактического подключения.
              </p>
              <RecipientTable items={PLANNED_RECIPIENTS} />
            </>
          )}

          {HOSTING && (
            <>
              <h2 style={{ marginTop: 36, marginBottom: 12 }}>Размещение сервера</h2>
              <RecipientTable items={[HOSTING]} />
            </>
          )}

          <p style={{ marginTop: 32, fontSize: "0.875rem", color: "var(--pub-text-3)" }}>
            Вопросы по обработке данных: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
