"use client";
import { useState, useEffect } from "react";
import { api, AuthUser, StudentRow, GiftedAssignment } from "../../lib/api";
import { Language } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";
import { fmLabels } from "./teacher-sections-utils";

export function TeacherGiftedSection({ token, userId, language, t, user }: {
  token: string; userId: string; language: Language; t: Record<string, string>; user: AuthUser;
}) {
  const [active, setActive] = useState<"achievements" | "workplan" | "my-students" | null>(null);
  const [classStudents, setClassStudents] = useState<StudentRow[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [giftedList, setGiftedList] = useState<GiftedAssignment[]>([]);
  const [giftedLoaded, setGiftedLoaded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalStudents, setModalStudents] = useState<StudentRow[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const labels = fmLabels(t);

  useEffect(() => {
    if (active !== "my-students" || studentsLoaded) return;
    api.getStudents(token)
      .then(data => { setClassStudents(data); setStudentsLoaded(true); })
      .catch(() => setStudentsLoaded(true));
  }, [active, token, studentsLoaded]);

  useEffect(() => {
    if (active !== "my-students" || giftedLoaded) return;
    api.getMyGiftedStudents(token)
      .then(data => { setGiftedList(data); setGiftedLoaded(true); })
      .catch(() => setGiftedLoaded(true));
  }, [active, token, giftedLoaded]);

  useEffect(() => {
    if (!showAddModal) return;
    setModalLoading(true);
    api.searchAllStudents(token, modalSearch || undefined)
      .then(setModalStudents)
      .catch(() => setModalStudents([]))
      .finally(() => setModalLoading(false));
  }, [showAddModal, modalSearch, token]);

  const filteredClassStudents = classStudents.filter(s =>
    s.fullName.toLowerCase().includes(studentSearch.toLowerCase())
  );
  const giftedStudentIds = new Set(giftedList.map(g => g.student?.id));

  async function handleAddGifted(studentId: string) {
    setAddBusy(true);
    try {
      const created = await api.addMyGiftedStudent(token, studentId);
      const student = modalStudents.find(s => s.id === studentId);
      if (student && created) {
        setGiftedList(prev => [...prev, { id: (created as { id: string }).id, student }]);
      }
      setShowAddModal(false);
      setModalSearch("");
    } catch { /* ignore */ } finally { setAddBusy(false); }
  }

  async function handleRemoveGifted(assignmentId: string) {
    await api.removeMyGiftedStudent(token, assignmentId);
    setGiftedList(prev => prev.filter(g => g.id !== assignmentId));
  }

  return (
    <div className="page">
      <h1 className="page-title">⭐ {t.nav_gifted}</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          className={`btn ${active === "achievements" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "achievements" ? null : "achievements")}
        >
          🏆 {t.gifted_my_achievements ?? "Мои достижения"}
        </button>
        <button
          className={`btn ${active === "workplan" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "workplan" ? null : "workplan")}
        >
          📋 {t.gifted_my_workplan ?? "Мой план работы"}
        </button>
        <button
          className={`btn ${active === "my-students" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setActive(p => p === "my-students" ? null : "my-students")}
        >
          👩‍🎓 Мои ученики
        </button>
      </div>

      {active === "achievements" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager token={token} section={`gifted-achievements-${userId}`} canEdit={true} canUpload={true} labels={labels} />
        </div>
      )}

      {active === "workplan" && (
        <div className="card" style={{ marginTop: 0 }}>
          <FileManager token={token} section={`gifted-workplan-${userId}`} canEdit={true} canUpload={true} labels={labels} />
        </div>
      )}

      {active === "my-students" && (
        <>
          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Мои ученики</h3>
              <input
                className="input" style={{ maxWidth: 220 }}
                placeholder="🔍 Поиск по имени..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                ⭐ Добавить одаренного ученика
              </button>
            </div>
            {!studentsLoaded ? (
              <p className="fm-empty">{t.loading}</p>
            ) : filteredClassStudents.length === 0 ? (
              <p className="fm-empty">{t.noData}</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>ФИО</th><th>Класс</th><th>ИИН</th><th>Родитель</th><th></th></tr>
                </thead>
                <tbody>
                  {filteredClassStudents.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td className="table-name">{s.fullName}</td>
                      <td className="muted">{s.classroom.name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 13 }}>{s.iin ?? "—"}</td>
                      <td className="muted">{s.parentName ?? "—"}</td>
                      <td>{giftedStudentIds.has(s.id) && <span title="Одарённый">⭐</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {giftedList.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 12, fontSize: 15 }}>Мои одарённые ученики</h3>
              <table className="data-table">
                <thead><tr><th>#</th><th>ФИО</th><th>Класс</th><th></th></tr></thead>
                <tbody>
                  {giftedList.map((g, idx) => (
                    <tr key={g.id}>
                      <td style={{ color: "var(--muted)", width: 36 }}>{idx + 1}</td>
                      <td className="table-name">⭐ {g.student?.fullName ?? "—"}</td>
                      <td className="muted">{g.student?.classroom?.name ?? "—"}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }}
                          onClick={() => handleRemoveGifted(g.id)}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setModalSearch(""); }}>
          <div className="modal-card" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Добавить одаренного ученика</h3>
            <input
              className="input" style={{ marginBottom: 12 }}
              placeholder="🔍 Поиск по имени..."
              value={modalSearch}
              onChange={e => setModalSearch(e.target.value)}
              autoFocus
            />
            {modalLoading ? (
              <p className="fm-empty">{t.loading}</p>
            ) : modalStudents.length === 0 ? (
              <p className="fm-empty">{t.noData}</p>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                <table className="data-table">
                  <thead><tr><th>ФИО</th><th>Класс</th><th></th></tr></thead>
                  <tbody>
                    {modalStudents.map(s => (
                      <tr key={s.id}>
                        <td className="table-name">{s.fullName}</td>
                        <td className="muted">{s.classroom.name}</td>
                        <td>
                          {giftedStudentIds.has(s.id) ? (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>⭐ Уже добавлен</span>
                          ) : (
                            <button className="btn btn-primary btn-sm" disabled={addBusy}
                              onClick={() => handleAddGifted(s.id)}>
                              + Добавить
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddModal(false); setModalSearch(""); }}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
