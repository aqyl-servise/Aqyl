"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type B2CProfile } from "../../../../lib/api";
import { getValidAccessToken } from "../../../../lib/auth";
import { generateDemoKmzh, topicPlaceholder, type DemoKmzh } from "../../../../lib/onboarding-demo";
import { useLang, LT, SUBJECT_OPTIONS, REGION_OPTIONS, type Lang } from "../../../../lib/lesson-translations";
import { LangSwitcher } from "../../../../components/lang-switcher";
import { Icon } from "../../../../components/ui/icon";

type T = Record<string, string>;

// Бренд-токены применяются через класс .aqyl-b2c на корне (см. globals.css).
const BRAND = "var(--lavender)";
const GREEN = "var(--mint)";
const DARK = "var(--white)";
const STORAGE_KEY = "aqyl_onboarding_data";
const TOTAL_STEPS = 4;

// Значения (value) исторически совпадают с русскими подписями и уходят в API —
// их менять нельзя. Переводится только то, что видит учитель (см. label).
const GRADE_OPTIONS = [
  { key: "obGr14", value: "1-4" },
  { key: "obGr59", value: "5-9" },
  { key: "obGr1011", value: "10-11" },
];

const LANGUAGES = [
  { key: "obLangRu", value: "ru" },
  { key: "obLangKz", value: "kz" },
  { key: "obLangMixed", value: "mixed" },
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
  padding: "9px 16px", borderRadius: 999, border: "1.5px solid var(--line)",
  background: "var(--ink-2)", color: "var(--white)", fontSize: 14, cursor: "pointer", fontWeight: 500, fontFamily: "inherit",
};
function pill(active: boolean): React.CSSProperties {
  return active
    ? { ...pillBase, border: "1.5px solid var(--lavender)", background: "rgba(139,127,232,.16)", color: "var(--lavender)", fontWeight: 600 }
    : pillBase;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = LT[lang];
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
    return <div className="aqyl-b2c" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{t.loading}</div>;
  }
  if (!profile) return null;

  const trialDays = daysLeft(profile.trialEndsAt);
  const canSkip = step === 2 || step === 3;

  return (
    <div className="aqyl-b2c" style={{ minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeInStep { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .ob-step { animation: fadeInStep 0.3s ease; }
        .ob-btn-primary { transition: filter 0.2s ease, transform 0.1s ease; }
        .ob-btn-primary:hover:not(:disabled) { filter: brightness(0.94); }
        .ob-btn-primary:active:not(:disabled) { transform: translateY(1px); }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 60px" }}>
        {/* Header: brand + progress + skip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--white)" }}>aqy<span style={{ color: "var(--amber)" }}>l</span></span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LangSwitcher lang={lang} setLang={setLang} />
            {canSkip && (
              <button
                onClick={() => finishOnboarding()}
                disabled={saving}
                style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 13, cursor: "pointer", fontWeight: 500, fontFamily: "inherit" }}
              >
                {t.obSkip}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <span style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{t.obStep.replace("{n}", String(step)).replace("{m}", String(TOTAL_STEPS))}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 12, height: 12, borderRadius: 999,
                  background: i < step ? BRAND : "var(--line)",
                  transition: "background 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        <div className="ob-step" key={step}>
          {step === 1 && <StepWelcome onNext={() => setStep(2)} t={t} />}
          {step === 2 && (
            <StepInfo
              subject={subject} setSubject={setSubject}
              gradeLevels={gradeLevels} toggleGrade={toggleGrade}
              language={language} setLanguage={setLanguage}
              region={region} setRegion={setRegion}
              onNext={() => setStep(3)} t={t} lang={lang}
            />
          )}
          {step === 3 && (
            <StepDemo
              subject={subject} topic={topic} setTopic={setTopic}
              demo={demo} generating={generating}
              onGenerate={handleGenerateDemo}
              onContinue={() => setStep(4)} t={t}
            />
          )}
          {step === 4 && (
            <StepDone
              trialDays={trialDays} saving={saving}
              onCreate={() => finishOnboarding("create-kmzh")}
              onExplore={() => finishOnboarding()} t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Welcome ──────────────────────────────────────────────────────────
function StepWelcome({ onNext, t }: { onNext: () => void; t: T }) {
  const cards = [
    { icon: "pencil" as const, title: t.obC1t, text: t.obC1x },
    { icon: "chart" as const, title: t.obC2t, text: t.obC2x },
    { icon: "target" as const, title: t.obC3t, text: t.obC3x },
  ];
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>{t.obTitle1}</h1>
      <p style={{ color: "var(--muted)", fontSize: 16, margin: "0 0 28px" }}>
        {t.obSub1}
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 30 }}>
        {cards.map((c) => (
          <div key={c.title} style={{ flex: "1 1 180px", minWidth: 180, background: "var(--ink-2)", borderRadius: 14, padding: "22px 18px", boxShadow: "0 4px 18px rgba(13,14,26,0.07)", textAlign: "center" }}>
            <div style={{ marginBottom: 10, color: "var(--lavender)" }}><Icon name={c.icon} size={30} strokeWidth={1.4} /></div>
            <div style={{ fontWeight: 700, color: DARK, marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>{c.text}</div>
          </div>
        ))}
      </div>
      <button className="ob-btn-primary" onClick={onNext} style={primaryBtn}>{t.obStart}</button>
    </div>
  );
}

// ── Step 2: Teaching info ────────────────────────────────────────────────────
function StepInfo(props: {
  subject: string; setSubject: (s: string) => void;
  gradeLevels: string[]; toggleGrade: (v: string) => void;
  language: string; setLanguage: (s: string) => void;
  region: string; setRegion: (s: string) => void;
  onNext: () => void; t: T; lang: Lang;
}) {
  const { subject, setSubject, gradeLevels, toggleGrade, language, setLanguage, region, setRegion, onNext, t, lang } = props;
  const canProceed = subject && gradeLevels.length > 0 && language;
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: 26, fontWeight: 700, margin: "0 0 22px" }}>{t.obTitle2}</h1>

      <FieldLabel>{t.obSubjectL}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {SUBJECT_OPTIONS.map((s) => (
          <button key={s.value} onClick={() => setSubject(s.value)} style={pill(subject === s.value)}>{s.label[lang]}</button>
        ))}
      </div>

      <FieldLabel>{t.obGradesL}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {GRADE_OPTIONS.map((g) => (
          <button key={g.value} onClick={() => toggleGrade(g.value)} style={pill(gradeLevels.includes(g.value))}>{t[g.key]}</button>
        ))}
      </div>

      <FieldLabel>{t.obLangL}</FieldLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
        {LANGUAGES.map((l) => (
          <button key={l.value} onClick={() => setLanguage(l.value)} style={pill(language === l.value)}>{t[l.key]}</button>
        ))}
      </div>

      <FieldLabel>{t.obRegionL}</FieldLabel>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--line)", fontSize: 15, marginBottom: 28, background: "var(--ink-2)", color: region ? "var(--white)" : "var(--muted)", boxSizing: "border-box", fontFamily: "inherit" }}
      >
        <option value="">{t.obRegionPick}</option>
        {REGION_OPTIONS.map((r) => <option key={r.value} value={r.value} style={{ color: "var(--white)" }}>{r.label[lang]}</option>)}
      </select>

      <button
        className="ob-btn-primary"
        onClick={onNext}
        disabled={!canProceed}
        style={{ ...primaryBtn, width: "100%", opacity: canProceed ? 1 : 0.5, cursor: canProceed ? "pointer" : "not-allowed" }}
      >
        {t.next}
      </button>
    </div>
  );
}

// ── Step 3: Demo generation ──────────────────────────────────────────────────
function StepDemo(props: {
  subject: string; topic: string; setTopic: (s: string) => void;
  demo: DemoKmzh | null; generating: boolean;
  onGenerate: () => void; onContinue: () => void; t: T;
}) {
  const { subject, topic, setTopic, demo, generating, onGenerate, onContinue, t } = props;
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>{t.obTitle3}</h1>
      <p style={{ color: "var(--muted)", fontSize: 15, margin: "0 0 22px" }}>{t.obSub3}</p>

      <FieldLabel>{t.obTopicL}</FieldLabel>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder={topicPlaceholder(subject)}
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid var(--line)", background: "var(--ink)", color: "var(--white)", fontSize: 15, marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" }}
      />

      <button
        className="ob-btn-primary"
        onClick={onGenerate}
        disabled={!topic.trim() || generating}
        style={{ ...primaryBtn, width: "100%", opacity: !topic.trim() || generating ? 0.6 : 1, cursor: !topic.trim() || generating ? "not-allowed" : "pointer" }}
      >
        {generating ? t.obGenerating : t.obGenDemo}
      </button>

      {demo && (
        <div style={{ marginTop: 24, background: "var(--ink-2)", borderRadius: 14, padding: "22px 20px", border: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: GREEN, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{t.obDemoLabel}</div>
          <h3 style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: 19, fontWeight: 700, margin: "0 0 14px" }}>{demo.title}</h3>

          <div style={{ fontWeight: 700, color: "var(--white)", fontSize: 14, marginBottom: 8 }}>{t.obGoals}</div>
          <ul style={{ margin: "0 0 18px", paddingLeft: 20, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
            {demo.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>

          <div style={{ fontWeight: 700, color: "var(--white)", fontSize: 14, marginBottom: 10 }}>{t.obStages}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 460 }}>
              <thead>
                <tr style={{ background: "var(--ink)", textAlign: "left", color: "var(--muted)" }}>
                  <th style={th}>{t.obThStage}</th>
                  <th style={th}>{t.obThTime}</th>
                  <th style={th}>{t.obThTeacher}</th>
                  <th style={th}>{t.obThStudent}</th>
                </tr>
              </thead>
              <tbody>
                {demo.stages.map((s, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--line)", verticalAlign: "top" }}>
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
            {t.obFullKmzh}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Done ─────────────────────────────────────────────────────────────
function StepDone(props: { trialDays: number; saving: boolean; onCreate: () => void; onExplore: () => void; t: T }) {
  const { trialDays, saving, onCreate, onExplore, t } = props;
  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--white)", fontSize: 30, fontWeight: 700, margin: "0 0 18px" }}>{t.obTitle4}</h1>
      <div style={{ background: "rgba(139,127,232,.14)", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", marginBottom: 26, textAlign: "left" }}>
        <div style={{ fontWeight: 700, color: "var(--white)", marginBottom: 8 }}>{t.obTrialAll}</div>
        {/* Без склонения слова «день»: одна фраза корректна во всех трёх языках. */}
        <div style={{ color: "var(--muted)", fontSize: 14 }}>
          {t.obTrialDays.replace("{n}", String(trialDays))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button className="ob-btn-primary" onClick={onCreate} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
          {t.obCreateFirst}
        </button>
        <button onClick={onExplore} disabled={saving} style={{ ...secondaryBtn, opacity: saving ? 0.7 : 1 }}>
          {t.obExplore}
        </button>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: "var(--white)", marginBottom: 10 }}>{children}</div>;
}

const primaryBtn: React.CSSProperties = {
  background: "var(--amber)", color: "var(--on-amber)", border: "none", borderRadius: 10,
  padding: "13px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent", color: "var(--white)", border: "1.5px solid var(--lavender)", borderRadius: 10,
  padding: "13px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
};
const th: React.CSSProperties = { padding: "8px 10px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 10px", color: "var(--muted)" };
