"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, AuthUser, StudentRow } from "../../lib/api";
import { Language } from "../../lib/translations";

const CATEGORY_LABELS: Record<string, string> = {
  "": "Не указана / Жоқ",
  "Вторая": "Екінші / Вторая",
  "Первая": "Бірінші / Первая",
  "Высшая": "Жоғары / Высшая",
  "Педагог-исследователь": "Педагог-зерттеуші / Педагог-исследователь",
  "Педагог-мастер": "Педагог-шебер / Педагог-мастер",
};

export function TeacherProfile({ token, user, language, t }: { token: string; user: AuthUser; language: Language; t: Record<string, string> }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const isClassTeacher = user.isClassTeacher === true;

  useEffect(() => {
    if (!isClassTeacher || !user.managedClassroomId) return;
    setLoadingStudents(true);
    api.getStudents(token, user.managedClassroomId)
      .then(setStudents)
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, [token, isClassTeacher, user.managedClassroomId]);

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

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="profile-header">
          <div className="profile-avatar">{user.fullName.charAt(0)}</div>
          <div>
            <h2 style={{ margin: 0 }}>{user.fullName}</h2>
            <p className="muted">{user.email} · {user.subject ?? "—"}</p>
            {isClassTeacher && user.managedClassroomName && (
              <p style={{ fontSize: 13, color: "var(--accent)", marginTop: 2 }}>
                Классный руководитель: <strong>{user.managedClassroomName}</strong>
              </p>
            )}
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
                {Object.entries(CATEGORY_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
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

      {isClassTeacher && (
        <div className="card" style={{ maxWidth: 640, marginTop: 16 }}>
          <h3 className="card-title">
            👩‍🎓 Мои ученики
            {user.managedClassroomName && (
              <span className="muted" style={{ fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                {user.managedClassroomName}
              </span>
            )}
          </h3>
          {loadingStudents ? (
            <p className="fm-empty">{t.loading}</p>
          ) : students.length === 0 ? (
            <p className="fm-empty">{t.noData}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t.name ?? "ФИО"}</th>
                  <th>{t.parentName ?? "Родитель"}</th>
                  <th>{t.parentContact ?? "Контакт"}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                    <td className="table-name">{s.fullName}</td>
                    <td className="muted">{s.parentName ?? "—"}</td>
                    <td className="muted">{s.parentContact ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
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
