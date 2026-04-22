"use client";
import { FormEvent, useState } from "react";
import { api, AuthUser } from "../../lib/api";
import { Language } from "../../lib/translations";

export function TeacherProfile({ token, user, language, t }: { token: string; user: AuthUser; language: Language; t: Record<string, string> }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    await api.updateProfile(token, {
      phone: String(fd.get("phone") || ""),
      experience: Number(fd.get("experience")),
      category: String(fd.get("category") || ""),
      university: String(fd.get("university") || ""),
      courses: String(fd.get("courses") || ""),
      achievements: String(fd.get("achievements") || ""),
      preferredLanguage: String(fd.get("preferredLanguage") || "ru"),
    });
    setSaved(true);
    setBusy(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.nav_profile}</h1>
      <div className="card" style={{ maxWidth: 600 }}>
        <div className="profile-header">
          <div className="profile-avatar">{user.fullName.charAt(0)}</div>
          <div>
            <h2 style={{ margin: 0 }}>{user.fullName}</h2>
            <p className="muted">{user.email} · {user.subject ?? "—"}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="form-stack" style={{ marginTop: 24 }}>
          <div className="form-row">
            <Field label={t.phone} name="phone" defaultValue={""} />
            <Field label={t.experience} name="experience" type="number" defaultValue={"0"} />
          </div>
          <div className="form-row">
            <div className="field">
              <label className="field-label">{t.category}</label>
              <select name="category" className="input">
                {["", "Вторая", "Первая", "Высшая", "Педагог-исследователь", "Педагог-мастер"].map((c) => (
                  <option key={c} value={c}>{c || "Не указана"}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Язык интерфейса</label>
              <select name="preferredLanguage" defaultValue={language} className="input">
                <option value="ru">Русский</option>
                <option value="kz">Қазақша</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <Field label={t.university} name="university" defaultValue={""} />
          <Field label={t.courses} name="courses" defaultValue={""} />
          <div className="field">
            <label className="field-label">{t.achievements}</label>
            <textarea name="achievements" className="textarea" defaultValue="" />
          </div>
          {saved && <div className="alert alert-success">✓ Профиль сохранён</div>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : `💾 ${t.save}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, type, defaultValue }: { label: string; name: string; type?: string; defaultValue?: string }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input name={name} type={type ?? "text"} defaultValue={defaultValue} className="input" />
    </div>
  );
}
