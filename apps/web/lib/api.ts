export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type UserRole = "teacher" | "admin" | "principal" | "vice_principal" | "class_teacher" | "student";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  preferredLanguage: string;
  role: UserRole;
  subject?: string | null;
  status?: "pending" | "active" | "rejected" | "inactive";
};

export type LoginResponse = { accessToken: string; user: AuthUser };

export type PendingUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  schoolName?: string;
  createdAt: string;
  status: "pending" | "active" | "rejected";
};

export type StudentRow = {
  id: string;
  fullName: string;
  iin?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentContact?: string;
  userId?: string;
  classroom: { id: string; name: string; grade: number };
  classTeacher?: { id: string; fullName: string };
};

export type ScheduleRow = {
  id: string;
  dayOfWeek: number;
  period: number;
  subject: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  teacher?: { id: string; fullName: string };
};

export type AssignmentWithSubmission = {
  id: string;
  title: string;
  description?: string;
  subject: string;
  dueDate?: string;
  maxScore: number;
  status: "active" | "closed";
  createdAt: string;
  teacher?: { id: string; fullName: string };
  submission: {
    id: string;
    content?: string;
    fileUrl?: string;
    score?: number;
    status: "pending" | "submitted" | "graded";
    submittedAt?: string;
  } | null;
};

export type GradeRow = {
  id: string;
  content?: string;
  fileUrl?: string;
  score?: number;
  status: "pending" | "submitted" | "graded";
  submittedAt?: string;
  createdAt: string;
  assignment: {
    id: string;
    title: string;
    subject: string;
    maxScore: number;
    dueDate?: string;
    teacher?: { id: string; fullName: string };
  };
};

export type ClassroomOption = {
  id: string;
  name: string;
  grade: number;
  classTeacher?: { id: string; fullName: string };
};

export type ClassroomItem = {
  id: string;
  name: string;
  grade: number;
  academicYear?: string;
  classTeacher?: { id: string; fullName: string } | null;
  studentCount: number;
};

export type TransferRecord = {
  id: string;
  fromClassroom?: { id: string; name: string } | null;
  toClassroom?: { id: string; name: string } | null;
  note?: string;
  transferredAt: string;
};

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/pdf") || ct.includes("octet-stream")) return (await res.blob()) as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (data: { fullName: string; email: string; password: string; role: string; schoolName: string }) =>
    request<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getMe: (token: string) => request<AuthUser>("/auth/me", undefined, token),
  updateProfile: (token: string, data: Record<string, unknown>) =>
    request<AuthUser>("/auth/profile", { method: "PATCH", body: JSON.stringify(data) }, token),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  // Dashboard (teacher)
  getDashboard: (token: string) =>
    request<{
      summary: { totalClasses: number; totalStudents: number; averageScore: number; generatedDocuments: number };
      classes: Array<{ id: string; name: string; grade: number; subject: string; studentCount: number }>;
      topicPerformance: Array<{ topic: string; average: number }>;
      strugglingStudents: Array<{ id: string; fullName: string; classroom: string; average: number }>;
      recentDocuments: Array<{ id: string; title: string; type: string; createdAt: string }>;
    }>("/dashboard", undefined, token),

  // Generators
  generateLessonPlan: (token: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/generators/lesson-plan", { method: "POST", body: JSON.stringify(body) }, token),
  generateTaskSet: (token: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>("/generators/task-set", { method: "POST", body: JSON.stringify(body) }, token),

  // Analytics
  uploadAnalytics: (token: string, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return request<Record<string, unknown>>("/analytics/upload", { method: "POST", body: fd }, token);
  },
  getSchoolStats: (token: string) =>
    request<{
      avgScore: number; totalStudents: number; totalClassrooms: number; submissionRate: number;
      topStudents: Array<{ id: string; fullName: string; avg: number; classroom: string }>;
      bottomStudents: Array<{ id: string; fullName: string; avg: number; classroom: string }>;
      bySubject: Array<{ subject: string; avgScore: number }>;
      byClass: Array<{ id: string; name: string; grade: number; avgScore: number; studentCount: number }>;
    }>("/analytics/school", undefined, token),
  getClassesStats: (token: string) =>
    request<Array<{
      id: string; name: string; grade: number; teacher: string; avgScore: number;
      studentCount: number; submissionRate: number;
      students: Array<{ id: string; fullName: string; iin?: string; avgScore: number; submitted: number; total: number }>;
    }>>("/analytics/classes", undefined, token),
  getStudentsStats: (token: string, q: string) =>
    request<Array<{
      id: string; fullName: string; iin?: string; classroom: string; overallAvg: number;
      subjects: Array<{ subject: string; avgScore: number; topics: Array<{ topic: string; score: number; maxScore: number }> }>;
    }>>(`/analytics/students?q=${encodeURIComponent(q)}`, undefined, token),
  aiAnalyzeSchool: (token: string, data: Record<string, unknown>) =>
    request<{ analysis: string }>("/analytics/ai-analyze", { method: "POST", body: JSON.stringify(data) }, token),

  // Exports
  exportPdf: (token: string, body: Record<string, unknown>) =>
    request<Blob>("/exports/pdf", { method: "POST", body: JSON.stringify(body) }, token),

  // Admin
  getAdminOverview: (token: string) =>
    request<{ teachers: number; classrooms: number; students: number; avgScore: number; documents: number; openLessons: number; protocols: number; pendingCount: number }>("/admin/overview", undefined, token),
  getAdminAnalytics: (token: string) =>
    request<Array<{ id: string; name: string; grade: number; subject: string; teacher: string; studentCount: number; avgScore: number }>>("/admin/analytics", undefined, token),
  getAdminTeachers: (token: string) =>
    request<Array<{ id: string; fullName: string; email: string; subject?: string; experience?: number; category?: string; classCount: number; studentCount: number; avgScore: number; docCount: number }>>("/admin/teachers", undefined, token),

  // Registrations (admin only)
  getPendingRegistrations: (token: string) =>
    request<PendingUser[]>("/admin/registrations", undefined, token),
  approveRegistration: (token: string, id: string) =>
    request<PendingUser>(`/admin/registrations/${id}/approve`, { method: "PATCH" }, token),
  rejectRegistration: (token: string, id: string) =>
    request<PendingUser>(`/admin/registrations/${id}/reject`, { method: "PATCH" }, token),

  // Users
  getUsers: (token: string) => request<AuthUser[]>("/users", undefined, token),
  createUser: (token: string, data: Record<string, unknown>) =>
    request<AuthUser>("/users", { method: "POST", body: JSON.stringify(data) }, token),
  updateUser: (token: string, id: string, data: Record<string, unknown>) =>
    request<AuthUser>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  deactivateUser: (token: string, id: string) =>
    request<AuthUser>(`/admin/users/${id}/deactivate`, { method: "PATCH" }, token),
  activateUser: (token: string, id: string) =>
    request<AuthUser>(`/admin/users/${id}/activate`, { method: "PATCH" }, token),
  deleteUser: (token: string, id: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}`, { method: "DELETE", body: JSON.stringify({ confirm: true }) }, token),
  changeUserPassword: (token: string, id: string, newPassword: string) =>
    request<{ ok: boolean }>(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ newPassword }) }, token),

  // Students
  getStudents: (token: string, classroomId?: string) =>
    request<StudentRow[]>(`/students${classroomId ? `?classroomId=${classroomId}` : ""}`, undefined, token),
  createStudent: (token: string, data: Record<string, unknown>) =>
    request<StudentRow>("/students", { method: "POST", body: JSON.stringify(data) }, token),
  updateStudent: (token: string, id: string, data: Record<string, unknown>) =>
    request<StudentRow>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  deleteStudent: (token: string, id: string) =>
    request<{ ok: boolean }>(`/students/${id}`, { method: "DELETE" }, token),
  getClassroomsForDropdown: (token: string) =>
    request<ClassroomOption[]>("/students/classrooms", undefined, token),
  getClassTeachersForDropdown: (token: string) =>
    request<Array<{ id: string; fullName: string }>>("/students/class-teachers", undefined, token),
  transferStudent: (token: string, studentId: string, classroomId: string, note?: string) =>
    request<StudentRow>(`/students/${studentId}/transfer`, { method: "POST", body: JSON.stringify({ classroomId, note }) }, token),
  getStudentTransfers: (token: string, studentId: string) =>
    request<TransferRecord[]>(`/students/${studentId}/transfers`, undefined, token),

  // Classrooms management
  getClassrooms: (token: string) =>
    request<ClassroomItem[]>("/classrooms", undefined, token),
  createClassroom: (token: string, data: { name: string; academicYear?: string; classTeacherId?: string }) =>
    request<ClassroomItem>("/classrooms", { method: "POST", body: JSON.stringify(data) }, token),
  updateClassroom: (token: string, id: string, data: { name?: string; academicYear?: string; classTeacherId?: string }) =>
    request<ClassroomItem>(`/classrooms/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  deleteClassroom: (token: string, id: string) =>
    request<{ ok: boolean }>(`/classrooms/${id}`, { method: "DELETE" }, token),
  bulkTransferStudents: (token: string, fromId: string, toId: string) =>
    request<{ transferred: number }>(`/classrooms/${fromId}/bulk-transfer`, { method: "POST", body: JSON.stringify({ toClassroomId: toId }) }, token),
  getClassroomClassTeachers: (token: string) =>
    request<Array<{ id: string; fullName: string }>>("/classrooms/class-teachers", undefined, token),

  // Schedule
  getMySchedule: (token: string) =>
    request<Array<{ id: string; dayOfWeek: number; period: number; subject: string; startTime?: string; endTime?: string; classroom: { id: string; name: string; grade: number } }>>("/schedule", undefined, token),
  getAllSchedule: (token: string) => request<unknown[]>("/schedule/all", undefined, token),
  getClassroomSchedule: (token: string, classroomId: string) =>
    request<Array<{ id: string; dayOfWeek: number; period: number; subject: string; startTime?: string; endTime?: string; teacher?: { fullName: string } }>>(`/schedule/classroom/${classroomId}`, undefined, token),

  // Assignments
  getMyAssignments: (token: string) =>
    request<Array<{ id: string; title: string; subject: string; dueDate?: string; maxScore: number; status: string; classroom: { id: string; name: string }; submissions: unknown[] }>>("/assignments", undefined, token),
  getClassroomAssignments: (token: string, classroomId: string) =>
    request<Array<{ id: string; title: string; subject: string; dueDate?: string; maxScore: number; teacher?: { fullName: string } }>>(`/assignments/classroom/${classroomId}`, undefined, token),
  createAssignment: (token: string, data: Record<string, unknown>) =>
    request<{ id: string }>("/assignments", { method: "POST", body: JSON.stringify(data) }, token),
  updateAssignment: (token: string, id: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/assignments/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  // Open Lessons
  getMyLessons: (token: string) =>
    request<Array<{ id: string; title: string; subject: string; grade: number; date?: string; status: string; description?: string; directorComment?: string }>>("/lessons", undefined, token),
  getAllLessons: (token: string) =>
    request<Array<{ id: string; title: string; subject: string; grade: number; date?: string; status: string; teacher?: { fullName: string } }>>("/lessons/all", undefined, token),
  createLesson: (token: string, data: Record<string, unknown>) =>
    request<{ id: string }>("/lessons", { method: "POST", body: JSON.stringify(data) }, token),
  updateLesson: (token: string, id: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/lessons/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  // Protocols
  getProtocols: (token: string) =>
    request<Array<{ id: string; title: string; type: string; date?: string; content?: string; createdBy?: { fullName: string } }>>("/protocols", undefined, token),
  createProtocol: (token: string, data: Record<string, unknown>) =>
    request<{ id: string }>("/protocols", { method: "POST", body: JSON.stringify(data) }, token),

  // Class Hours
  getMyClassHours: (token: string) =>
    request<Array<{ id: string; title: string; topic: string; date?: string; duration?: number; notes?: string; classroom: { name: string } }>>("/class-hours", undefined, token),
  getAllClassHours: (token: string) =>
    request<Array<{ id: string; title: string; topic: string; date?: string; classTeacher?: { fullName: string }; classroom?: { name: string } }>>("/class-hours/all", undefined, token),
  createClassHour: (token: string, data: Record<string, unknown>) =>
    request<{ id: string }>("/class-hours", { method: "POST", body: JSON.stringify(data) }, token),

  // Files
  uploadFile: (token: string, file: File) => {
    const fd = new FormData(); fd.append("file", file);
    return request<{ id: string; filename: string; originalName: string; url: string }>("/files/upload", { method: "POST", body: fd }, token);
  },

  // File manager
  uploadFileToFolder: (token: string, file: File, folderId?: string, section?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (folderId) fd.append("folderId", folderId);
    if (section) fd.append("section", section);
    return request<{ id: string; filename: string; originalName: string; url: string }>("/files/upload", { method: "POST", body: fd }, token);
  },
  listFilesInFolder: (token: string, folderId: string | null | undefined, section?: string) => {
    const q = new URLSearchParams();
    if (folderId === null) q.set("folderId", "null");
    else if (folderId) q.set("folderId", folderId);
    if (section) q.set("section", section);
    const qs = q.toString();
    return request<Array<{ id: string; filename: string; originalName: string; mimetype: string; size: number; folderId?: string; section?: string; createdAt: string; uploadedBy?: { id: string; fullName: string } }>>(`/files${qs ? "?" + qs : ""}`, undefined, token);
  },
  deleteFile: (token: string, id: string) =>
    request<{ ok: boolean }>(`/files/file/${id}`, { method: "DELETE" }, token),
  createFolder: (token: string, data: { name: string; parentId?: string; section?: string; teacherRefId?: string }) =>
    request<{ id: string; name: string; parentId?: string; section?: string; teacherRefId?: string; createdAt: string }>("/files/folder", { method: "POST", body: JSON.stringify(data) }, token),
  listFolders: (token: string, params?: { parentId?: string; section?: string; teacherRefId?: string }) => {
    const q = new URLSearchParams();
    if (params?.parentId) q.set("parentId", params.parentId);
    if (params?.section) q.set("section", params.section);
    if (params?.teacherRefId) q.set("teacherRefId", params.teacherRefId);
    const qs = q.toString();
    return request<Array<{ id: string; name: string; parentId?: string; section?: string; teacherRefId?: string; createdAt: string }>>(`/files/folders${qs ? "?" + qs : ""}`, undefined, token);
  },
  getFolderContents: (token: string, folderId: string) =>
    request<{
      folder: { id: string; name: string; parentId?: string; section?: string };
      subfolders: Array<{ id: string; name: string; parentId?: string }>;
      files: Array<{ id: string; filename: string; originalName: string; mimetype: string; size: number; createdAt: string; uploadedBy?: { id: string; fullName: string } }>;
    }>(`/files/folder/${folderId}`, undefined, token),
  deleteFolder: (token: string, id: string) =>
    request<{ ok: boolean }>(`/files/folder/${id}`, { method: "DELETE" }, token),

  // Gifted
  getGiftedPlans: (token: string, type?: string) =>
    request<Array<{ id: string; type: string; title: string; fileUrl?: string; createdAt: string; uploadedBy?: { fullName: string } }>>(
      `/gifted/plans${type ? `?type=${type}` : ""}`, undefined, token),
  createGiftedPlan: (token: string, data: { type: string; title: string; fileUrl?: string }) =>
    request<{ id: string }>("/gifted/plans", { method: "POST", body: JSON.stringify(data) }, token),
  deleteGiftedPlan: (token: string, id: string) =>
    request<{ ok: boolean }>(`/gifted/plans/${id}`, { method: "DELETE" }, token),

  getGiftedStudents: (token: string, classroomId?: string) =>
    request<Array<{ id: string; notes?: string; student: { id: string; fullName: string; classroom: { id: string; name: string; grade: number; classTeacher?: { fullName: string } } } }>>(
      `/gifted/students${classroomId ? `?classroomId=${classroomId}` : ""}`, undefined, token),
  markGifted: (token: string, studentId: string) =>
    request<{ id: string }>("/gifted/students", { method: "POST", body: JSON.stringify({ studentId }) }, token),
  removeGiftedStudent: (token: string, id: string) =>
    request<{ ok: boolean }>(`/gifted/students/${id}`, { method: "DELETE" }, token),

  searchAllStudents: (token: string, q?: string) =>
    request<Array<{ id: string; fullName: string; classroom: { id: string; name: string; grade: number } }>>(
      `/gifted/all-students${q ? `?q=${encodeURIComponent(q)}` : ""}`, undefined, token),

  getGiftedTeachers: (token: string) =>
    request<Array<{ id: string; fullName: string; subject?: string; experience?: number; category?: string; giftedCount: number; materialCount: number }>>(
      "/gifted/teachers", undefined, token),
  getGiftedTeacherStudents: (token: string, teacherId: string) =>
    request<Array<{ id: string; student: { id: string; fullName: string; classroom: { id: string; name: string; grade: number; classTeacher?: { fullName: string } } } }>>(
      `/gifted/teachers/${teacherId}/students`, undefined, token),
  addGiftedAssignment: (token: string, teacherId: string, studentId: string) =>
    request<{ id: string }>("/gifted/teacher-assignments", { method: "POST", body: JSON.stringify({ teacherId, studentId }) }, token),
  removeGiftedAssignment: (token: string, id: string) =>
    request<{ ok: boolean }>(`/gifted/teacher-assignments/${id}`, { method: "DELETE" }, token),

  getGiftedMaterials: (token: string, teacherId: string, category?: string) =>
    request<Array<{ id: string; category: string; title: string; fileUrl?: string; linkUrl?: string; createdAt: string }>>(
      `/gifted/materials?teacherId=${teacherId}${category ? `&category=${category}` : ""}`, undefined, token),
  addGiftedMaterial: (token: string, data: { teacherId: string; category: string; title: string; fileUrl?: string; linkUrl?: string }) =>
    request<{ id: string }>("/gifted/materials", { method: "POST", body: JSON.stringify(data) }, token),
  deleteGiftedMaterial: (token: string, id: string) =>
    request<{ ok: boolean }>(`/gifted/materials/${id}`, { method: "DELETE" }, token),

  getGiftedStudentCard: (token: string, studentId: string) =>
    request<{
      id: string; fullName: string;
      classroom: { id: string; name: string; grade: number; classTeacher?: { fullName: string } | null };
      schedule: Array<{ dayOfWeek: number; period: number; subject: string; startTime?: string; endTime?: string }>;
      grades: Array<{ topic: string; score: number; maxScore: number; submittedAt: string }>;
      achievements: Array<{ id: string; title: string; date?: string; level: string; subject?: string; place?: string }>;
    }>(`/gifted/student-card/${studentId}`, undefined, token),
  addGiftedAchievement: (token: string, data: { studentId: string; title: string; date?: string; level: string; subject?: string; place?: string }) =>
    request<{ id: string }>("/gifted/achievements", { method: "POST", body: JSON.stringify(data) }, token),
  deleteGiftedAchievement: (token: string, id: string) =>
    request<{ ok: boolean }>(`/gifted/achievements/${id}`, { method: "DELETE" }, token),

  // AI Chat
  aiChat: (token: string, body: { message: string; context?: string; pageContext?: string }) =>
    request<{ reply: string }>("/ai/chat", { method: "POST", body: JSON.stringify(body) }, token),
  aiGenerateAssignment: (token: string, body: { subject: string; grade: string; topic: string; type: string }) =>
    request<{ content: string }>("/ai/generate-assignment", { method: "POST", body: JSON.stringify(body) }, token),
  aiGenerateLessonPlan: (token: string, body: { subject: string; grade: string; topic: string; duration: number }) =>
    request<{ content: string }>("/ai/generate-lesson-plan", { method: "POST", body: JSON.stringify(body) }, token),

  // Student portal
  getStudentMe: (token: string) =>
    request<StudentRow>("/student/me", undefined, token),
  getStudentSchedule: (token: string) =>
    request<ScheduleRow[]>("/student/schedule", undefined, token),
  getStudentAssignments: (token: string) =>
    request<AssignmentWithSubmission[]>("/student/assignments", undefined, token),
  submitStudentAssignment: (token: string, assignmentId: string, data: { content?: string; fileUrl?: string }) =>
    request<{ id: string; status: string }>(`/student/assignments/${assignmentId}/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }, token),
  getStudentGrades: (token: string) =>
    request<GradeRow[]>("/student/grades", undefined, token),

  // Attestation
  getAttestations: (token: string) =>
    request<Array<{
      teacher: { id: string; fullName: string; subject?: string; email: string; experience?: number };
      attestation: { id: string; category?: string; categoryDate?: string; nextAttestationDate?: string; ozpResult?: string } | null;
    }>>("/attestation", undefined, token),
  updateAttestation: (token: string, teacherId: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/attestation/${teacherId}`, { method: "PATCH", body: JSON.stringify(data) }, token),

  // Final Attestation
  getFinalStudents: (token: string, grade: 9 | 11) =>
    request<Array<{ id: string; grade: number; fullName: string; subject?: string; iin?: string; email?: string; phone?: string; parentName?: string; createdAt: string }>>(`/final-attestation/students?grade=${grade}`, undefined, token),
  createFinalStudent: (token: string, data: Record<string, unknown>) =>
    request<{ id: string }>("/final-attestation/students", { method: "POST", body: JSON.stringify(data) }, token),
  updateFinalStudent: (token: string, id: string, data: Record<string, unknown>) =>
    request<{ id: string }>(`/final-attestation/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }, token),
  deleteFinalStudent: (token: string, id: string) =>
    request<{ ok: boolean }>(`/final-attestation/students/${id}`, { method: "DELETE" }, token),

  // KTP/KSP
  getKtpFiles: (token: string, section: string) =>
    request<Array<{
      id: string; filename: string; originalName: string; mimetype: string; size: number; createdAt: string;
      uploadedBy: { id: string; fullName: string } | null;
      review: { status: string; comment?: string; reviewedBy: string | null; updatedAt: string } | null;
    }>>(`/ktp/files?section=${encodeURIComponent(section)}`, undefined, token),
  saveKtpReview: (token: string, fileId: string, data: { status: string; comment?: string }) =>
    request<{ id: string }>(`/ktp/reviews/${fileId}`, { method: "PATCH", body: JSON.stringify(data) }, token),
};
