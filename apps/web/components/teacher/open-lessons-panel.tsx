"use client";
import { FormEvent, useEffect, useState } from "react";
import { api, ClassroomOption } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { LessonAnalysisForm } from "./lesson-analysis-form";

type Lesson = {
  id: string; subject: string; classroomId?: string; cabinet?: string; lessonTime?: string;
  date?: string; lessonTopic?: string; visitPurpose?: string; lessonPurpose?: string;
  equipment?: string; status: string; teacher?: { id: string; fullName: string };
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Запланирован",
  conducted: "Проведён",
  analyzed: "Проанализирован",
};
const STATUS_COLORS: Record<string, string> = {
  planned: "score-mid",
  conducted: "score-high",
  analyzed: "badge",
};

type View =
  | { type: "list" }
  | { type: "form"; lesson?: Lesson }
  | { type: "materials"; lesson: Lesson }
  | { type: "analysis"; lesson: Lesson; readOnly: boolean };

export function OpenLessonsPanel({
  token, language, t, isAdmin,
}: {
  token: string; language: Language; t: Record<string, string>; isAdmin: boolean;
}) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [view, setView] = useState<View>({ type: "list" });
  const [busy, setBusy] = useState(false);

  function reload() {
    const req = isAdmin ? api.getAllLessons(token) : api.getMyLessons(token);
    req.then((l) => setLessons(l as Lesson[])).catch(console.error);
  }

  useEffect(() => {
    reload();
    api.getClassroomsForDropdown(token).then(setClassrooms).catch(console.error);
  }, [token, isAdmin]);

  async function handleDelete(id: string) {
    if (!confirm("Урокты жою?")) return;
    await api.deleteLesson(token, id);
    reload();
  }

  function classroomName(id?: string) {
    if (!id) return "—";
    return classrooms.find((c) => c.id === id)?.name ?? id;
  }

  if (view.type === "materials") {
    return (
      <div className="page">
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => setView({ type: "list" })}>← Назад</button>
          <h1 className="page-title">Материалы — {view.lesson.lessonTopic ?? view.lesson.subject}</h1>
        </div>
        <FileManager
          token={token}
          section={`open-lesson-${view.lesson.id}`}
          canEdit={!isAdmin}
          canUpload={!isAdmin}
          labels={{ upload: "Жүктеу", newFolder: "+ Папка" }}
        />
      </div>
    );
  }

  if (view.type === "analysis") {
    return (
      <LessonAnalysisForm
        token={token}
        lesson={view.lesson}
        classroomName={classroomName(view.lesson.classroomId)}
        readOnly={view.readOnly}
        onClose={() => { setView({ type: "list" }); reload(); }}
      />
    );
  }

  if (view.type === "form") {
    return (
      <LessonForm
        token={token}
        classrooms={classrooms}
        lesson={view.lesson}
        busy={busy}
        setBusy={setBusy}
        onDone={() => { setView({ type: "list" }); reload(); }}
        onCancel={() => setView({ type: "list" })}
      />
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🎓 {t.nav_lessons}</h1>
        {!isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => setView({ type: "form" })}>+ Добавить</button>
        )}
      </div>

      <div className="card">
        {lessons.length === 0 ? (
          <p className="empty-state">{t.noData}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата и время</th>
                  <th>Класс</th>
                  <th>Предмет</th>
                  {isAdmin && <th>ФИО учителя</th>}
                  <th>Тема урока</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.date ? new Date(l.date).toLocaleDateString("ru-RU") : "—"}
                      {l.lessonTime ? ` ${l.lessonTime}` : ""}
                    </td>
                    <td>{classroomName(l.classroomId)}</td>
                    <td>{l.subject}</td>
                    {isAdmin && <td>{l.teacher?.fullName ?? "—"}</td>}
                    <td className="table-name">{l.lessonTopic ?? "—"}</td>
                    <td>
                      <span className={`score-chip ${STATUS_COLORS[l.status] ?? "badge"}`}>
                        {STATUS_LABELS[l.status] ?? l.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button className="btn btn-outline btn-sm"
                          onClick={() => setView({ type: "materials", lesson: l })}>
                          Материалы
                        </button>
                        {isAdmin && (
                          <>
                            {l.status === "analyzed" ? (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => setView({ type: "analysis", lesson: l, readOnly: true })}>
                                Просмотреть
                              </button>
                            ) : (
                              <button className="btn btn-primary btn-sm"
                                onClick={() => setView({ type: "analysis", lesson: l, readOnly: false })}>
                                Анализ урока
                              </button>
                            )}
                          </>
                        )}
                        {!isAdmin && (
                          <>
                            <button className="btn btn-ghost btn-sm"
                              onClick={() => setView({ type: "form", lesson: l })}>
                              Изменить
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                              onClick={() => handleDelete(l.id)}>
                              Удалить
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LessonForm({
  token, classrooms, lesson, busy, setBusy, onDone, onCancel,
}: {
  token: string;
  classrooms: ClassroomOption[];
  lesson?: Lesson;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      subject: fd.get("subject"),
      classroomId: fd.get("classroomId") || undefined,
      cabinet: fd.get("cabinet") || undefined,
      lessonTime: fd.get("lessonTime") || undefined,
      date: fd.get("date") || undefined,
      lessonTopic: fd.get("lessonTopic") || undefined,
      visitPurpose: fd.get("visitPurpose") || undefined,
      lessonPurpose: fd.get("lessonPurpose") || undefined,
      equipment: fd.get("equipment") || undefined,
    };
    try {
      if (lesson) {
        await api.updateLesson(token, lesson.id, data);
      } else {
        await api.createLesson(token, data);
      }
      onDone();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>← Назад</button>
        <h1 className="page-title">{lesson ? "Редактировать урок" : "Новый открытый урок"}</h1>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-row">
            <div className="field">
              <label className="field-label">Дата проведения</label>
              <input name="date" type="date" className="input"
                defaultValue={lesson?.date ? lesson.date.substring(0, 10) : ""} />
            </div>
            <div className="field">
              <label className="field-label">Время проведения</label>
              <input name="lessonTime" type="time" className="input"
                defaultValue={lesson?.lessonTime ?? ""} />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label className="field-label">Класс</label>
              <select name="classroomId" className="input" defaultValue={lesson?.classroomId ?? ""}>
                <option value="">— Выбрать класс —</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label">Кабинет</label>
              <input name="cabinet" className="input" defaultValue={lesson?.cabinet ?? ""} />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Пән / Предмет</label>
            <input name="subject" className="input" required defaultValue={lesson?.subject ?? ""} />
          </div>

          <div className="field">
            <label className="field-label">Сабақ тақырыбы / Тема урока</label>
            <input name="lessonTopic" className="input" defaultValue={lesson?.lessonTopic ?? ""} />
          </div>

          <div className="field">
            <label className="field-label">Сабаққа қатынасу мақсаты</label>
            <textarea name="visitPurpose" className="textarea" rows={3}
              defaultValue={lesson?.visitPurpose ?? ""} />
          </div>

          <div className="field">
            <label className="field-label">Сабақтың мақсаты</label>
            <textarea name="lessonPurpose" className="textarea" rows={3}
              defaultValue={lesson?.lessonPurpose ?? ""} />
          </div>

          <div className="field">
            <label className="field-label">Сабақтың жабдықталуы</label>
            <textarea name="equipment" className="textarea" rows={3}
              defaultValue={lesson?.equipment ?? ""} />
          </div>

          <div className="form-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : "Сохранить"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
