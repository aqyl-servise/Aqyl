"use client";
import { ReactNode, useState } from "react";
import { AuthUser } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { LangSwitcher } from "../aqyl-app";
import { AiChat, AiChatButton } from "../ai/ai-chat";
import { ThemeToggle } from "../ui/theme-toggle";

type NavItem = { key: string; label: string; icon: string };

export function AppLayout({
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

  return (
    <div className="al-root">
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
      <AiChatButton open={aiOpen} onClick={() => setAiOpen((v) => !v)} />

      {/* AI chat panel */}
      <AiChat token={token} currentSection={activeSection} open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
