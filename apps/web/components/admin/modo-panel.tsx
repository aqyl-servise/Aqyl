"use client";
import { useState, useEffect } from "react";
import { api, StudentRow } from "../../lib/api";
import { Language, translations } from "../../lib/translations";
import { FileManager } from "../ui/file-manager";

type ModoTab = "order" | "action-plan" | "monitoring" | "student-info";
type MonSub = "teacher-works" | "corrections" | "diagrams";
type GradeFilter = 4 | 9 | null;

interface TeacherItem {
  id: string;
  fullName: string;
  subject?: string;
}

interface Props {
  token: string;
  language: Language;
  userRole: string;
}

function fmLabels(language: Language) {
  const t = translations[language];
  return {
    home: t.fm_home,
    newFolder: t.fm_new_folder,
    upload: t.fm_upload,
    uploading: t.fm_uploading,
    search: t.fm_search,
    folderName: t.fm_folder_name,
    create: t.fm_create,
    cancel: t.cancel,
    noFiles: t.fm_no_files,
    download: t.fm_download,
    delete: t.fm_delete,
    loading: t.loading,
  };
}

export function ModoPanel({ token, language, userRole }: Props) {
  const t = translations[language];
  const labels = fmLabels(language);

  const [tab, setTab] = useState<ModoTab>("order");
  const [monSub, setMonSub] = useState<MonSub>("teacher-works");

  // Monitoring — teacher works
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherItem | null>(null);

  // Student info
  const [studentGrade, setStudentGrade] = useState<4 | 9>(4);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  const canEdit = ["admin", "principal", "vice_principal"].includes(userRole);
  const canUpload = canEdit;

  // Load teachers once when monitoring tab is first opened
  useEffect(() => {
    if (tab !== "monitoring" || teachersLoaded) return;
    setLoadingTeachers(true);
    api.getAdminTeachers(token)
      .then(data => { setTeachers(data); setTeachersLoaded(true); })
      .catch(() => setTeachersLoaded(true))
      .finally(() => setLoadingTeachers(false));
  }, [tab, token, teachersLoaded]);

  // Load students once when student-info tab is first opened
  useEffect(() => {
    if (tab !== "student-info" || studentsLoaded) return;
    setLoadingStudents(true);
    api.getStudents(token)
      .then(data => { setStudents(data); setStudentsLoaded(true); })
      .catch(() => setStudentsLoaded(true))
      .finally(() => setLoadingStudents(false));
  }, [tab, token, studentsLoaded]);

  const filteredTeachers = teachers.filter(teacher => {
    if (!subjectFilter) return true;
    const q = subjectFilter.toLowerCase();
    return (
      teacher.fullName.toLowerCase().includes(q) ||
      (teacher.subject ?? "").toLowerCase().includes(q)
    );
  });

  const filteredStudents = students.filter(s => s.classroom.grade === studentGrade);

  // Section key encodes grade so grade-4 and grade-9 works are stored separately
  const teacherSection = gradeFilter ? `modo-teacher-work-${gradeFilter}` : "modo-teacher-work";

  const TABS: { key: ModoTab; label: string }[] = [
    { key: "order", label: t.modo_order },
    { key: "action-plan", label: t.modo_action_plan },
    { key: "monitoring", label: t.modo_monitoring },
    { key: "student-info", label: t.modo_student_info },
  ];

  const MON_SUBS: { key: MonSub; label: string }[] = [
    { key: "teacher-works", label: t.modo_teacher_works },
    { key: "corrections", label: t.modo_corrections },
    { key: "diagrams", label: t.modo_diagrams },
  ];

  return (
    <div className="page">
      <h1 className="page-title">📑 {t.nav_bbjm}</h1>

      {/* Main tab bar */}
      <div className="sc-tabs">
        {TABS.map(tb => (
          <button
            key={tb.key}
            className={`sc-tab${tab === tb.key ? " sc-tab-active" : ""}`}
            onClick={() => { setTab(tb.key); setSelectedTeacher(null); }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 0 }}>

        {/* ── Tab 1: Приказ ────────────────────────────────── */}
        {tab === "order" && (
          <FileManager
            token={token} section="modo-order"
            canEdit={canEdit} canUpload={canUpload} labels={labels}
          />
        )}

        {/* ── Tab 2: Іс-шара жоспары ───────────────────────── */}
        {tab === "action-plan" && (
          <FileManager
            token={token} section="modo-action-plan"
            canEdit={canEdit} canUpload={canUpload} labels={labels}
          />
        )}

        {/* ── Tab 3: Мониторинг ────────────────────────────── */}
        {tab === "monitoring" && (
          <div>
            {/* Monitoring sub-tabs */}
            <div className="sc-tabs" style={{ marginBottom: 16 }}>
              {MON_SUBS.map(sub => (
                <button
                  key={sub.key}
                  className={`sc-tab${monSub === sub.key ? " sc-tab-active" : ""}`}
                  onClick={() => { setMonSub(sub.key); setSelectedTeacher(null); }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* 3a — Teacher works */}
            {monSub === "teacher-works" && (
              selectedTeacher ? (
                /* Teacher file manager */
                <div>
                  <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
                    onClick={() => setSelectedTeacher(null)}>
                    ← {t.modo_teacher_works}
                  </button>
                  <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
                    📁 {selectedTeacher.fullName}
                    {gradeFilter && (
                      <span style={{ marginLeft: 8, color: "var(--muted)", fontWeight: 400 }}>
                        — {gradeFilter === 4 ? t.modo_grade_4 : t.modo_grade_9}
                      </span>
                    )}
                  </h2>
                  <FileManager
                    token={token}
                    section={teacherSection}
                    teacherRefId={selectedTeacher.id}
                    canEdit={canEdit}
                    canUpload={canUpload}
                    labels={labels}
                  />
                </div>
              ) : (
                /* Teacher list with filters */
                <div>
                  <div className="modo-filters">
                    {/* Grade filter buttons */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {([null, 4, 9] as GradeFilter[]).map(g => (
                        <button
                          key={String(g)}
                          className={`btn btn-sm ${gradeFilter === g ? "btn-primary" : "btn-ghost"}`}
                          onClick={() => setGradeFilter(g)}
                        >
                          {g === null ? t.modo_all_grades : g === 4 ? t.modo_grade_4 : t.modo_grade_9}
                        </button>
                      ))}
                    </div>
                    {/* Subject / name search */}
                    <input
                      className="input"
                      style={{ maxWidth: 240 }}
                      placeholder={`${t.modo_filter_subject} / ${t.name}...`}
                      value={subjectFilter}
                      onChange={e => setSubjectFilter(e.target.value)}
                    />
                  </div>

                  {loadingTeachers ? (
                    <p className="fm-empty">{t.loading}</p>
                  ) : filteredTeachers.length === 0 ? (
                    <p className="fm-empty">{t.noData}</p>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t.name}</th>
                          <th>{t.subject}</th>
                          <th>{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeachers.map(teacher => (
                          <tr key={teacher.id}>
                            <td>{teacher.fullName}</td>
                            <td>{teacher.subject ?? "—"}</td>
                            <td>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setSelectedTeacher(teacher)}
                              >
                                📁 {t.modo_teacher_files_btn}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            )}

            {/* 3b — Error corrections */}
            {monSub === "corrections" && (
              <FileManager
                token={token} section="modo-corrections"
                canEdit={canEdit} canUpload={canUpload} labels={labels}
              />
            )}

            {/* 3c — Diagrams */}
            {monSub === "diagrams" && (
              <FileManager
                token={token} section="modo-diagrams"
                canEdit={canEdit} canUpload={canUpload} labels={labels}
              />
            )}
          </div>
        )}

        {/* ── Tab 4: Информация об учениках ────────────────── */}
        {tab === "student-info" && (
          <div>
            {/* Grade toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {([4, 9] as const).map(g => (
                <button
                  key={g}
                  className={`btn btn-sm ${studentGrade === g ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setStudentGrade(g)}
                >
                  {g === 4 ? t.modo_grade_4 : t.modo_grade_9}
                </button>
              ))}
            </div>

            {/* Student list from DB */}
            <div style={{ marginBottom: 28 }}>
              <p className="section-subtitle">
                {t.modo_student_list} — {studentGrade === 4 ? t.modo_grade_4 : t.modo_grade_9}
                {!loadingStudents && ` (${filteredStudents.length})`}
              </p>
              {loadingStudents ? (
                <p className="fm-empty">{t.loading}</p>
              ) : filteredStudents.length === 0 ? (
                <p className="fm-empty">{t.noData}</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t.name}</th>
                      <th>{t.nav_classrooms}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => (
                      <tr key={student.id}>
                        <td style={{ color: "var(--muted)", width: 40 }}>{idx + 1}</td>
                        <td>{student.fullName}</td>
                        <td>{student.classroom.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Excel file storage */}
            <div>
              <p className="section-subtitle">{t.modo_upload_excel}</p>
              <FileManager
                token={token}
                section={`modo-student-info-${studentGrade}`}
                canEdit={canEdit}
                canUpload={canUpload}
                labels={labels}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
