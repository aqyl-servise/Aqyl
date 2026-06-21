"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";
import { generateDemoKmzh, topicPlaceholder, type DemoKmzh } from "../../../../lib/onboarding-demo";

const BRAND = "#6B5CE7";
const GREEN = "#2DC08E";
const DARK = "#0D0E1A";
const STORAGE_KEY = "aqyl_onboarding_data";
const TOTAL_STEPS = 4;

const SUBJECTS = [
  "Математика", "Русский язык", "Казахский язык", "История", "Физика",
  "Химия", "Биология", "География", "Английский язык", "Информатика",
  "Литература", "Физкультура", "Другое",
];

const GRADE_OPTIONS = [
  { label: "1-4 класс", value: "1-4" },
  { label: "5-9 класс", value: "5-9" },
  { label: "10-11 класс", value: "10-11" },
];

const LANGUAGES = [
  { label: "Русский", value: "ru" },
  { label: "Қазақша", value: "kz" },
  { label: "Смешанный", value: "mixed" },
];

const REGIONS = [
  "Алматы", "Астана", "Шымкент", "Жамбылская", "Карагандинская",
  "Восточно-Казахстанская", "Западно-Казахстанская", "Мангистауская",
  "Актюбинская", "Павлодарская", "Северо-Казахстанская", "Костанайская",
  "Кызылординская", "Туркестанская", "Акмолинская", "Атырауская",
  "Абайская", "Жетісу", "Улытау",
];

function daysLeft(date: string | null): number {
  if (!date) return 0;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

type SavedData = {
  step?: number;
  subject?: string;
  gradeLevels?: string[];
  language?: string;
  region?: string;
  topic?: string;
};

const pillBase: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 999, border: "1.5px solid #d9d9e3",
  background: "#fff", color: DARK, fontSize: 14, cursor: "pointer", fontWeight: 500,
};
function pill(active: boolean): React.CSSProperties {
  return active
    ? { ...pillBase, border: `1.5px solid ${BRAND}`, background: "#efeaff", color: BRAND, fontWeight: 600 }
    : pillBase;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<B2CProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [language, setLanguage] = useState("");
  const [region, setRegion] = useState("");
  const [topic, setTopic] = useState("");
  const [demo, setDemo] = useState<DemoKmzh | null>(null);
  const [generating, setGenerating] = useState(false);

  // Загрузка профиля + восстановление прогресса из localStorage.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getValidAccessToken();
      if (!token) { router.replace("/login"); return; }
      try {
        const me = await api.getB2CMe(token);
        if (!active) return;
        if (me.onboardingCompleted) { router.replace("/dashboard/b2c"); return; }
        setProfile(me);
        if (me.subject) setSubject(me.subject);
      } catch {
        if (active) router.replace("/login");
        return;
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  // Восстановление сохранённых данных формы (один раз на маунте).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as SavedData;
      if (d.subject) setSubject(d.subject);
      if (d.gradeLevels) setGradeLevels(d.gradeLevels);
      if (d.language) setLanguage(d.language);
      if (d.region) setRegion(d.region);
      if (d.topic) setTopic(d.topic);
      if (d.step && d.step >= 1 && d.step <= TOTAL_STEPS) setStep(d.step);
    } catch { /* ignore */ }
  }, []);

  // Сохранение прогресса при каждом изменении.
  useEffect(() => {
    const data: SavedData = { step, subject, gradeLevels, language, region, topic };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [step, subject, gradeLevels, language, region, topic]);

  function toggleGrade(value: string) {
    setGradeLevels((prev) => prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]);
  }

  async function persist(extra: Record<string, unknown>) {
    const token = await getValidAccessToken();
    if (!token) { router.replace("/login"); return; }
    await api.updateB2CProfile(token, {
      subject: subject || undefined,
      gradeLevel: gradeLevels.join(",") || undefined,
      language: language || undefined,
      region: region || undefined,
      ...extra,
    });
  }

  async function finishOnboarding(action?: "create-kmzh") {
    setSaving(true);
    try {
      await persist({ onboardingCompleted: true });
      localStorage.removeItem(STORAGE_KEY);
      router.replace(action === "create-kmzh" ? "/dashboard/b2c?action=create-kmzh" : "/dashboard/b2c");
    } catch {
      setSaving(false);
    }
  }

  function handleGenerateDemo() {
    setGenerating(true);
    // Имитация задержки генерации для ощущения «работы AI».
    setTimeout(() => {
      setDemo(generateDemoKmzh({ subject, gradeLevel: gradeLevels[0], topic, language }));
      setGenerating(false);
    }, 700);
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>Загрузка…</div>;
  }
  if (!profile) return null;

  const trialDays = daysLeft(profile.trialEndsAt);
  const canSkip = step === 2 || step === 3;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5fb", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeInStep { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .ob-step { animation: fadeInStep 0.3s ease; }
        .ob-btn-primary { transition: background 0.2s ease, transform 0.1s ease; }
        .ob-btn-primary:hover:not(:disabled) { background: #5a4bd6 !important; }
        .ob-btn-primary:active:not(:disabled) { transform: translateY(1px); }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header: brand + progress + skip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <span style={{ color: BRAND, fontWeight: 800, fontSize: 22 }}>Aqyl</span>
          {canSkip && (
            <button
              onClick={() => finishOnboarding()}
              disabled={saving}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
            >
              Пропустить →
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>Шаг {step} из {TOTAL_STEPS}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 12, height: 12, borderRadius: 999,
                  background: i < step ? BRAND : "#d9d9e3",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        <div className="ob-step" key={step}>
          {step === 1 && <StepWelcome onNext={() => setStep(2)} />}
          {step === 2 && (
            <StepInfo
              subject={subject} setSubject={setSubject}
              gradeLevels={gradeLevels} toggleGrade={toggleGrade}
              language={language} setLanguage={setLanguage}
              region={region} setRegion={setRegion}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepDemo
              subject={subject} topic={topic} setTopic={setTopic}
              demo={demo} generating={generating}
              onGenerate={handleGenerateDemo}
              onContinue={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepDone
              trialDays={trialDays} saving={saving}
              onCreate={() => finishOnboarding("create-kmzh")}
              onExplore={() => finishOnboarding()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext }: { onNext: () => void }) {
  const cards = [
    { icon: "📝", title: "КМЖ за 30 секунд", text: "Создавайте планы уроков по стандартам МОН РК" },
    { icon: "📊", title: "Оценки и отчёты", text: "Автоматические БЖБ/ТЖБ и аналитика" },
    { icon: "🎯", title: "Готовые материалы", text: "Презентации и иллюстрации к урокам" },
  ];
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ color: DARK, fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Добро пожаловать в Aqyl 👋</h1>
      <p style={{ color: "#6b7280", fontSize: 16, margin: "0 0 28px" }}>
        Мы поможем вам экономить до 3 часов в неделю на документации
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 30 }}>
        {cards.map((c) => (
          <div key={c.title} style={{ flex: "1 1 180px", minWidth: 180, background: "#fff", borderRadius: 14, padding: "22px 18px", boxShadow: "0 4px 18px rgba(13,14,26,0.07)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, color: DARK, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{c.text}</div>
          </div>
        ))}
      </div>
      <button className="ob-btn-primary" onClick={onNext} style={primaryBtn}>Начать настройку →</button>
    </div>
  );
}

// ── Step 2: Teaching info ────────────────────────────────────────────────────
function StepInfo(props: {
  subject: string; setSubject: (s: string) => void;
  gradeLevels: string[]; toggleGrade: (v: string) => void;
  language: string; setLanguage: (s: string) => void;
  region: string; setRegion: (s: string) => void;
  onNext: () => void;
}) {
  const { subject, setSubject, gradeLevels, toggleGrade, language, setLanguage, region, setRegion, onNext } = props;
  const canProceed = subject && gradeLevels.length > 0 && language;
  return (
    <div>
      <h1 style={{ color: DARK, fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Расскажите о себе</h1>

      <FieldLabel>Предмет</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {SUBJECTS.map((s) => (
          <button key={s} onClick={() => setSubject(s)} style={pill(subject === s)}>{s}</button>
        ))}
      </div>

      <FieldLabel>Классы</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {GRADE_OPTIONS.map((g) => (
          <button key={g.value} onClick={() => toggleGrade(g.value)} style={pill(gradeLevels.includes(g.value))}>{g.label}</button>
        ))}
      </div>

      <FieldLabel>Язык обучения</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {LANGUAGES.map((l) => (
          <button key={l.value} onClick={() => setLanguage(l.value)} style={pill(language === l.value)}>{l.label}</button>
        ))}
      </div>

      <FieldLabel>Область (необязательно)</FieldLabel>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #d9d9e3", fontSize: 15, marginBottom: 28, background: "#fff", color: region ? DARK : "#9ca3af", boxSizing: "border-box" }}
      >
        <option value="">Выберите область…</option>
        {REGIONS.map((r) => <option key={r} value={r} style={{ color: DARK }}>{r}</option>)}
      </select>

      <button
        className="ob-btn-primary"
        onClick={onNext}
        disabled={!canProceed}
        style={{ ...primaryBtn, width: "100%", opacity: canProceed ? 1 : 0.5, cursor: canProceed ? "pointer" : "not-allowed" }}
      >
        Далее →
      </button>
    </div>
  );
}

// ── Step 3: Demo generation ──────────────────────────────────────────────────
function StepDemo(props: {
  subject: string; topic: string; setTopic: (s: string) => void;
  demo: DemoKmzh | null; generating: boolean;
  onGenerate: () => void; onContinue: () => void;
}) {
  const { subject, topic, setTopic, demo, generating, onGenerate, onContinue } = props;
  return (
    <div>
      <h1 style={{ color: DARK, fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Попробуйте прямо сейчас</h1>
      <p style={{ color: "#6b7280", fontSize: 15, margin: "0 0 22px" }}>Введите тему урока и получите план за 30 секунд</p>

      <FieldLabel>Тема урока</FieldLabel>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={topicPlaceholder(subject)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #d9d9e3", fontSize: 15, marginBottom: 16, boxSizing: "border-box" }}
      />

      <button
        className="ob-btn-primary"
        onClick={onGenerate}
        disabled={!topic.trim() || generating}
        style={{ ...primaryBtn, width: "100%", opacity: !topic.trim() || generating ? 0.6 : 1, cursor: !topic.trim() || generating ? "not-allowed" : "pointer" }}
      >
        {generating ? "Генерируем…" : "Сгенерировать демо-урок ✨"}
      </button>

      {demo && (
        <div style={{ marginTop: 24, background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 4px 18px rgba(13,14,26,0.08)" }}>
          <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Демо-пример</div>
          <h3 style={{ color: DARK, fontSize: 18, margin: "0 0 14px" }}>{demo.title}</h3>

          <div style={{ fontWeight: 700, color: DARK, fontSize: 14, marginBottom: 8 }}>Цели урока:</div>
          <ul style={{ margin: "0 0 18px", paddingLeft: 20, color: "#374151", fontSize: 14, lineHeight: 1.7 }}>
            {demo.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>

          <div style={{ fontWeight: 700, color: DARK, fontSize: 14, marginBottom: 10 }}>Этапы урока:</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
              <thead>
                <tr style={{ background: "#f4f5fb", textAlign: "left", color: "#6b7280" }}>
                  <th style={th}>Этап</th>
                  <th style={th}>Время</th>
                  <th style={th}>Учитель</th>
                  <th style={th}>Ученики</th>
                </tr>
              </thead>
              <tbody>
                {demo.stages.map((s, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #ececf3", verticalAlign: "top" }}>
                    <td style={td}><strong>{s.name}</strong></td>
                    <td style={td}>{s.duration}</td>
                    <td style={td}>{s.teacherActivity}</td>
                    <td style={td}>{s.studentActivity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="ob-btn-primary" onClick={onContinue} style={{ ...primaryBtn, width: "100%", marginTop: 20 }}>
            Создать полный КМЖ в дашборде →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────────────────
function StepDone(props: { trialDays: number; saving: boolean; onCreate: () => void; onExplore: () => void }) {
  const { trialDays, saving, onCreate, onExplore } = props;
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ color: DARK, fontSize: 28, fontWeight: 800, margin: "0 0 18px" }}>Всё готово! 🎉</h1>
      <div style={{ background: "#efeaff", border: `1px solid ${BRAND}33`, borderRadius: 14, padding: "20px 22px", marginBottom: 26, textAlign: "left" }}>
        <div style={{ fontWeight: 700, color: DARK, marginBottom: 8 }}>В пробном периоде доступны все функции бесплатно</div>
        <div style={{ color: "#4b5563", fontSize: 14 }}>
          Осталось <strong style={{ color: BRAND }}>{trialDays}</strong> {trialDays === 1 ? "день" : trialDays < 5 ? "дня" : "дней"} пробного периода.
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="ob-btn-primary" onClick={onCreate} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
          Создать первый КМЖ
        </button>
        <button onClick={onExplore} disabled={saving} style={{ ...secondaryBtn, opacity: saving ? 0.7 : 1 }}>
          Изучить дашборд
        </button>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 10 }}>{children}</div>;
}

const primaryBtn: React.CSSProperties = {
  background: BRAND, color: "#fff", border: "none", borderRadius: 10,
  padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  background: "#fff", color: BRAND, border: `1.5px solid ${BRAND}`, borderRadius: 10,
  padding: "13px 26px", fontSize: 15, fontWeight: 600, cursor: "pointer",
};
const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 10px", color: "#374151" };
