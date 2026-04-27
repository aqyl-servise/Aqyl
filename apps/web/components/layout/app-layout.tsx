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
  navItems, activeSection, onNav, children,
}: {
  user: AuthUser; token: string; language: Language;
  setLanguage: (l: Language) => void; onLogout: () => void;
  navItems: NavItem[]; activeSection: string;
  onNav: (key: string) => void; children: ReactNode;
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
            <span className="al-brand-icon">✦</span>
            <span className="al-brand-name">{t.appName}</span>
          </div>
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
            {/* AI nav item — always at bottom of nav */}
            <button
              className={`al-nav-item al-nav-ai${aiOpen ? " active" : ""}`}
              onClick={() => setAiOpen((v) => !v)}
            >
              <span className="al-nav-icon">✦</span>
              <span>ИИ Помощник</span>
            </button>
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
