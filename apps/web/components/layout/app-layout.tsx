"use client";
import { ReactNode, useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { LangSwitcher } from "../aqyl-app";
import { AiChat, AiChatButton } from "../ai/ai-chat";
import { ThemeToggle } from "../ui/theme-toggle";
import { AiUsageProvider, useAiUsage } from "../../contexts/ai-usage-context";

type NavItem = { key: string; label: string; icon: string };

function AiUsageIndicator({ language }: { language: Language }) {
  const { usage, isLimited } = useAiUsage();
  if (!usage) return null;
  const { count, limit, percentage } = usage;

  let color = "#4caf50";
  let icon = "🤖";
  if (percentage >= 100) { color = "#f44336"; icon = "🚫"; }
  else if (percentage >= 80) { color = "#ff9800"; icon = "⚠️"; }
  else if (percentage >= 60) { color = "#ffc107"; }

  const label = isLimited ? translations[language].ai_limit_reached : `${count}/${limit}`;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 6, background: "var(--bg-secondary, rgba(0,0,0,0.08))", fontSize: 12, color }}>
      <span>{icon}</span>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function AiWarningBanner() {
  const { showWarning, warningMessage, dismissWarning } = useAiUsage();
  if (!showWarning || !warningMessage) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
      background: "#ff9800", color: "#fff", padding: "10px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontSize: 14, fontWeight: 500,
    }}>
      <span>⚠️ {warningMessage}. Лимит обновляется в полночь.</span>
      <button onClick={dismissWarning} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  );
}

function AiLimitModal({ onClose, language }: { onClose: () => void; language: Language }) {
  const t = translations[language];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-card, #fff)", borderRadius: 12, padding: "28px 32px",
        maxWidth: 400, textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{t.ai_limit_modal_title} (20/20)</h3>
        <p style={{ margin: "0 0 20px", color: "var(--text-secondary, #666)", fontSize: 14 }}>{t.ai_limit_modal_body}</p>
        <button className="btn btn-primary" onClick={onClose}>{t.ai_limit_modal_ok}</button>
      </div>
    </div>
  );
}

function AppLayoutInner({
  user, token, language, setLanguage, onLogout,
  navItems, activeSection, onNav, children, schoolSwitcher,
}: {
  user: AuthUser; token: string; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
  navItems: NavItem[]; activeSection: string;
  onNav: (key: string) => void; children: ReactNode;
  schoolSwitcher?: ReactNode;
}) {
  const t = translations[language];
  const roleLabel = t[`role_${user.role}` as keyof typeof t] ?? user.role;
  const [aiOpen, setAiOpen] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const { isLimited } = useAiUsage();

  const isLimitedRole = user.role === "teacher" || user.role === "class_teacher";

  function handleAiClick() {
    if (isLimited) {
      setShowLimitModal(true);
    } else {
      setAiOpen((v) => !v);
    }
  }

  return (
    <div className="al-root">
      <AiWarningBanner />
      {showLimitModal && <AiLimitModal onClose={() => setShowLimitModal(false)} language={language} />}

      {/* Sidebar */}
      <aside className="al-sidebar">
        <div className="al-sidebar-top">
          <div className="al-brand">
            <span className="al-brand-icon">
              <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="26" height="26" aria-hidden="true">
                <circle cx="40" cy="40" r="38" fill="none" stroke="#7F77DD" strokeWidth="1"/>
                <circle cx="40" cy="40" r="36" fill="#3d3499"/>
                <path d="M 37 19 L 19 62 L 24 62 L 43 19 Z" fill="#9B95E4"/>
                <path d="M 37 19 L 43 19 L 61 62 L 56 62 Z" fill="#3DB88E"/>
                <rect x="27" y="42" width="25" height="5" rx="1.5" fill="#F5A623"/>
                <circle cx="40" cy="19" r="4" fill="white" opacity="0.96"/>
                <circle cx="40" cy="19" r="2" fill="#2E2780"/>
              </svg>
            </span>
            <span className="al-brand-name">aqyl</span>
          </div>
          {schoolSwitcher && (
            <div style={{ padding: "0 8px", marginBottom: 4 }}>
              {schoolSwitcher}
            </div>
          )}
          <nav className="al-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`al-nav-item${activeSection === item.key ? " active" : ""}`}
                onClick={() => onNav(item.key)}
              >
                <span className="al-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="al-sidebar-bottom">
          {isLimitedRole && (
            <div style={{ padding: "4px 8px 8px" }}>
              <AiUsageIndicator language={language} />
            </div>
          )}
          <div className="al-user-info">
            <div className="al-avatar">{user.fullName.charAt(0)}</div>
            <div>
              <p className="al-user-name">{user.fullName}</p>
              <p className="al-user-role">{roleLabel}</p>
            </div>
          </div>
          <LangSwitcher language={language} onChange={setLanguage} />
          <ThemeToggle />
          <button className="btn btn-ghost btn-sm al-logout" onClick={onLogout}>{t.logout}</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="al-main">
        <div className="al-content">{children}</div>
      </main>

      {/* AI floating button */}
      <AiChatButton open={aiOpen && !isLimited} onClick={handleAiClick} />

      {/* AI chat panel */}
      <AiChat token={token} currentSection={activeSection} open={aiOpen && !isLimited} onClose={() => setAiOpen(false)} />
    </div>
  );
}

export function AppLayout(props: {
  user: AuthUser; token: string; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
  navItems: NavItem[]; activeSection: string;
  onNav: (key: string) => void; children: ReactNode;
  schoolSwitcher?: ReactNode;
}) {
  const isLimitedRole = props.user.role === "teacher" || props.user.role === "class_teacher";
  return (
    <AiUsageProvider token={props.token} isLimitedRole={isLimitedRole}>
      <AppLayoutInner {...props} />
    </AiUsageProvider>
  );
}
