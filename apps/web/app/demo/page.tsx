import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "../../components/public-header";
import { PublicFooter } from "../../components/public-footer";
import { TRIAL_LABEL } from "../../lib/product";

export const metadata: Metadata = {
  title: "Демо — готовый краткосрочный план урока | Aqyl",
  description:
    "Пример краткосрочного плана урока (КСП), созданного в Aqyl по формату №130. Открывается без регистрации.",
};

/**
 * Демонстрация продукта БЕЗ регистрации.
 *
 * Правило App Store 5.1.1 (и 4.2 о минимальной функциональности) требует, чтобы
 * проверяющий увидел суть продукта, не создавая учётной записи. Раньше кнопка
 * «Смотреть демо» вела на /login — это самая частая причина отказов.
 *
 * Страница статическая: показывает реальный результат генерации, ничего не
 * запрашивает у API и не требует ключа ИИ.
 */

const HEADER_ROWS: [string, string][] = [
  ["Раздел", "Алгебраические выражения"],
  ["Предмет", "Алгебра"],
  ["Класс", "8"],
  ["Тема урока", "Квадратные уравнения"],
  ["Цели обучения", "8.2.1.4 — решать квадратные уравнения по формуле корней"],
  ["Длительность", "45 минут"],
  ["Ценность месяца", "Труд и созидание"],
];

type Stage = {
  name: string;
  minutes: number;
  teacher: string;
  student: string;
  criteria: string;
  points: number;
};

const STAGES: Stage[] = [
  {
    name: "Разминка",
    minutes: 7,
    teacher: "Выводит на доску четыре уравнения и просит определить, какие из них квадратные.",
    student: "В парах распределяют уравнения на квадратные и не квадратные, объясняют признак.",
    criteria: "Различает квадратное уравнение по виду",
    points: 1,
  },
  {
    name: "Объяснение",
    minutes: 10,
    teacher: "Разбирает формулу дискриминанта и три случая: D > 0, D = 0, D < 0.",
    student: "Записывают формулу, проговаривают вслух условие для каждого случая.",
    criteria: "Называет число корней по знаку дискриминанта",
    points: 2,
  },
  {
    name: "Задание",
    minutes: 15,
    teacher: "Раздаёт карточки с уравнениями трёх уровней сложности, сопровождает работу.",
    student: "Решают уравнения самостоятельно, сверяют ответ с соседом по парте.",
    criteria: "Верно вычисляет дискриминант и находит корни",
    points: 4,
  },
  {
    name: "Квиз",
    minutes: 8,
    teacher: "Проводит короткий опрос: пять уравнений, ответ поднятием карточки.",
    student: "Отвечают, объясняют ход решения при расхождении ответов.",
    criteria: "Применяет формулу корней в новой ситуации",
    points: 2,
  },
  {
    name: "Рефлексия",
    minutes: 5,
    teacher: "Просит закончить фразу: «Сегодня я научился…» и «Мне осталось непонятным…».",
    student: "Записывают два предложения на стикере и оставляют на доске.",
    criteria: "Оценивает собственное понимание темы",
    points: 1,
  },
];

const TOTAL_POINTS = STAGES.reduce((sum, s) => sum + s.points, 0);

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "var(--pub-text-3)",
  borderBottom: "1px solid var(--pub-border)",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = {
  padding: "12px",
  fontSize: "0.875rem",
  color: "var(--pub-text-2)",
  borderBottom: "1px solid var(--pub-border)",
  verticalAlign: "top",
};

export default function DemoPage() {
  return (
    <div className="aqyl-pub">
      <PublicHeader />

      <section className="pub-section">
        <div className="pub-container">
          <span className="pub-badge pub-badge-green" style={{ marginBottom: 16 }}>
            Пример без регистрации
          </span>
          <h1 style={{ marginBottom: 12 }}>Так выглядит готовый урок</h1>
          <p style={{ maxWidth: 640, marginBottom: 32 }}>
            Учитель ввёл одну тему — «Квадратные уравнения, 8 класс». Ниже результат: краткосрочный
            план по формату №130, с этапами, критериями оценивания и распределением 10 баллов.
            Такой документ выгружается в Word одним нажатием.
          </p>

          {/* Шапка КСП */}
          <div className="pub-card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 14 }}>Шапка КСП</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "10px 24px" }}>
              {HEADER_ROWS.map(([k, v]) => (
                <div key={k} style={{ fontSize: "0.875rem" }}>
                  <span style={{ color: "var(--pub-text-3)" }}>{k}: </span>
                  <span style={{ color: "var(--pub-text)", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ход урока */}
          <div className="pub-card" style={{ marginBottom: 24, overflowX: "auto" }}>
            <h3 style={{ marginBottom: 14 }}>Ход урока</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={th}>Этап / Время</th>
                  <th style={th}>Действия учителя</th>
                  <th style={th}>Действия обучающегося</th>
                  <th style={th}>Критерий оценивания</th>
                  <th style={th}>Баллы</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((s) => (
                  <tr key={s.name}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <strong style={{ color: "var(--pub-text)" }}>{s.name}</strong>
                      <br />
                      {s.minutes} мин
                    </td>
                    <td style={td}>{s.teacher}</td>
                    <td style={td}>{s.student}</td>
                    <td style={td}>{s.criteria}</td>
                    <td style={{ ...td, fontWeight: 600, color: "var(--pub-text)" }}>{s.points}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, fontWeight: 600, color: "var(--pub-text)" }} colSpan={4}>
                    Итого
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: "var(--pub-purple)" }}>{TOTAL_POINTS} / 10</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
              padding: "20px 22px", borderRadius: "var(--pub-radius-md)",
              background: "var(--pub-purple-bg)", border: "1px solid var(--pub-border)",
            }}
          >
            <div style={{ flex: "1 1 260px" }}>
              <div style={{ fontWeight: 600, color: "var(--pub-text)", marginBottom: 4 }}>
                Соберите такой урок по своей теме
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--pub-text-2)" }}>
                {TRIAL_LABEL}, без привязки карты.
              </div>
            </div>
            <Link href="/register" className="pub-btn pub-btn-primary">
              Начать бесплатно →
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
