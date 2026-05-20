import { Injectable, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, MoreThanOrEqual, Repository } from "typeorm";
import * as XLSX from "xlsx";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";
import { FLSubmission } from "../schools/entities/fl-submission.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { AiClientService } from "../../services/ai-client.service";
import { buildPrompt } from "../../utils/prompt-builder";
import { TokenService } from "../tokens/token.service";

type AnalyticsRow = {
  student: string; classroom: string; topic: string; score: number; maxScore: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Classroom)
    private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission)
    private readonly tsRepo: Repository<TaskSubmission>,
    @InjectRepository(FLAssignment)
    private readonly flAssignmentRepo: Repository<FLAssignment>,
    @InjectRepository(FLSubmission)
    private readonly flSubmissionRepo: Repository<FLSubmission>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    private readonly aiClientService: AiClientService,
    @Optional() private readonly tokenService?: TokenService,
  ) {}

  // ── Existing Excel upload ────────────────────────────────────────────────
  parseWorkbook(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);

    const rows: AnalyticsRow[] = rawRows
      .map((row) => ({
        student: String(row.Student ?? row.student ?? row["Ученик"] ?? row["Оқушы"] ?? "").trim(),
        classroom: String(row.Class ?? row.class ?? row["Класс"] ?? row["Сынып"] ?? "").trim(),
        topic: String(row.Topic ?? row.topic ?? row["Тема"] ?? row["Тақырып"] ?? "").trim(),
        score: Number(row.Score ?? row.score ?? row["Балл"] ?? 0),
        maxScore: Number(row.MaxScore ?? row.maxScore ?? row["Макс балл"] ?? row.Max ?? 100),
      }))
      .filter((r) => r.student && r.classroom && r.topic && r.maxScore > 0);

    const avg = rows.reduce((s, r) => s + r.score / r.maxScore, 0) / Math.max(rows.length, 1);
    const topicMap = new Map<string, { total: number; count: number }>();
    const classMap = new Map<string, { total: number; count: number }>();
    rows.forEach((r) => {
      const t = topicMap.get(r.topic) ?? { total: 0, count: 0 };
      t.total += r.score / r.maxScore; t.count += 1; topicMap.set(r.topic, t);
      const c = classMap.get(r.classroom) ?? { total: 0, count: 0 };
      c.total += r.score / r.maxScore; c.count += 1; classMap.set(r.classroom, c);
    });
    return {
      summary: { totalRows: rows.length, averageScore: Math.round(avg * 100), uniqueStudents: new Set(rows.map((r) => r.student)).size, uniqueClasses: new Set(rows.map((r) => r.classroom)).size },
      rows,
      topicAnalytics: [...topicMap.entries()].map(([topic, v]) => ({ topic, average: Math.round((v.total / v.count) * 100) })),
      classAnalytics: [...classMap.entries()].map(([classroom, v]) => ({ classroom, average: Math.round((v.total / v.count) * 100) })),
    };
  }

  // ── School-wide stats ────────────────────────────────────────────────────
  async getSchoolStats(teacherClassroomIds?: string[], schoolId?: string) {
    const classroomWhere = teacherClassroomIds
      ? teacherClassroomIds.map((id) => ({ id }))
      : schoolId ? { schoolId } : undefined;

    const classrooms = await this.classroomRepo.find({
      where: classroomWhere,
      relations: { students: { submissions: true, taskSubmissions: { assignment: true } } },
      order: { grade: "ASC", name: "ASC" },
    });

    const allStudents = classrooms.flatMap((c) =>
      c.students.map((s) => {
        const subs = s.submissions ?? [];
        const tsubs = (s.taskSubmissions ?? []).filter((ts) => ts.score != null);
        const allScores = [
          ...subs.map((sub) => (Number(sub.score) / Number(sub.maxScore)) * 100),
          ...tsubs.map((ts) => (Number(ts.score!) / Number(ts.assignment?.maxScore ?? 100)) * 100),
        ];
        const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
        return { id: s.id, fullName: s.fullName, iin: s.iin, avg, classroom: c.name };
      })
    );

    const schoolAvg = allStudents.length
      ? Math.round(allStudents.reduce((s, st) => s + st.avg, 0) / allStudents.length)
      : 0;

    const sorted = [...allStudents].sort((a, b) => b.avg - a.avg);
    const topStudents = sorted.slice(0, 5);
    const bottomStudents = sorted.filter((s) => s.avg > 0).slice(-5).reverse();

    const subjectMap = new Map<string, { total: number; count: number }>();
    for (const cls of classrooms) {
      for (const s of cls.students) {
        for (const ts of (s.taskSubmissions ?? [])) {
          if (ts.score == null || !ts.assignment?.subject) continue;
          const subj = ts.assignment.subject;
          const pct = (Number(ts.score) / Number(ts.assignment.maxScore ?? 100)) * 100;
          const cur = subjectMap.get(subj) ?? { total: 0, count: 0 };
          cur.total += pct; cur.count += 1;
          subjectMap.set(subj, cur);
        }
      }
    }
    const bySubject = [...subjectMap.entries()]
      .map(([subject, v]) => ({ subject, avgScore: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avgScore - a.avgScore);

    const allAssignments = await this.assignmentRepo.count(
      teacherClassroomIds
        ? { where: teacherClassroomIds.map((id) => ({ classroom: { id } })) }
        : schoolId ? { where: { schoolId } } : undefined
    );
    const submittedCount = await this.tsRepo.count({
      where: schoolId
        ? [{ status: "submitted", assignment: { schoolId } }, { status: "graded", assignment: { schoolId } }]
        : [{ status: "submitted" }, { status: "graded" }],
    });
    const submissionRate = allAssignments > 0 ? Math.round((submittedCount / (allAssignments * Math.max(allStudents.length, 1))) * 100) : 0;

    const byClass = classrooms.map((c) => {
      const studs = c.students ?? [];
      const scores = studs.map((s) => {
        const allS = [
          ...(s.submissions ?? []).map((sub) => (Number(sub.score) / Number(sub.maxScore)) * 100),
          ...(s.taskSubmissions ?? []).filter((ts) => ts.score != null).map((ts) => (Number(ts.score!) / Number(ts.assignment?.maxScore ?? 100)) * 100),
        ];
        return allS.length ? allS.reduce((a, b) => a + b, 0) / allS.length : 0;
      });
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { id: c.id, name: c.name, grade: c.grade, avgScore: avg, studentCount: studs.length };
    });

    return {
      avgScore: schoolAvg,
      totalStudents: allStudents.length,
      totalClassrooms: classrooms.length,
      submissionRate: Math.min(submissionRate, 100),
      topStudents,
      bottomStudents,
      bySubject,
      byClass,
    };
  }

  // ── Per-class stats ──────────────────────────────────────────────────────
  async getClassesStats(teacherClassroomIds?: string[], schoolId?: string) {
    const classroomWhere = teacherClassroomIds
      ? teacherClassroomIds.map((id) => ({ id }))
      : schoolId ? { schoolId } : undefined;

    const classrooms = await this.classroomRepo.find({
      where: classroomWhere,
      relations: { students: { submissions: true, taskSubmissions: { assignment: true } }, teacher: true, classTeacher: true },
      order: { grade: "ASC", name: "ASC" },
    });

    const flAvgMap = await this.getFlAvgByClassroom(classrooms.map((c) => c.id));

    return classrooms.map((c) => {
      const students = (c.students ?? []).map((s) => {
        const subs = (s.submissions ?? []).map((sub) => (Number(sub.score) / Number(sub.maxScore)) * 100);
        const tsubs = (s.taskSubmissions ?? []).filter((ts) => ts.score != null).map((ts) => (Number(ts.score!) / Number(ts.assignment?.maxScore ?? 100)) * 100);
        const all = [...subs, ...tsubs];
        const avg = all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length) : 0;
        const submitted = (s.taskSubmissions ?? []).filter((ts) => ts.status === "submitted" || ts.status === "graded").length;
        const total = (s.taskSubmissions ?? []).length;
        return { id: s.id, fullName: s.fullName, iin: s.iin, avgScore: avg, submitted, total };
      });

      const classAvg = students.length
        ? Math.round(students.reduce((a, b) => a + b.avgScore, 0) / students.length)
        : 0;
      const totalSub = students.reduce((a, b) => a + b.submitted, 0);
      const totalAss = students.reduce((a, b) => a + b.total, 0);

      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        teacher: c.teacher?.fullName ?? c.classTeacher?.fullName ?? "—",
        avgScore: classAvg,
        studentCount: students.length,
        submissionRate: totalAss > 0 ? Math.round((totalSub / totalAss) * 100) : 0,
        flAvgScore: flAvgMap.get(c.id) ?? null,
        students: students.sort((a, b) => b.avgScore - a.avgScore),
      };
    });
  }

  // ── FL average score per classroom ───────────────────────────────────────
  private async getFlAvgByClassroom(classroomIds: string[]): Promise<Map<string, number | null>> {
    if (classroomIds.length === 0) return new Map();

    const flAssignments = await this.flAssignmentRepo.find({
      where: { classroomId: In(classroomIds) },
      select: { id: true, classroomId: true },
    });
    if (flAssignments.length === 0) return new Map();

    const assignmentIds = flAssignments.map((a) => a.id);
    const submissions = await this.flSubmissionRepo.find({
      where: { assignmentId: In(assignmentIds) },
      select: { assignmentId: true, totalScore: true, maxScore: true, status: true },
    });

    const gradedSubs = submissions.filter(
      (s) => (s.status === "submitted" || s.status === "graded") && s.totalScore != null && s.maxScore != null && Number(s.maxScore) > 0,
    );

    const assignmentToClassroom = new Map(flAssignments.map((a) => [a.id, a.classroomId]));
    const classroomScores = new Map<string, { total: number; count: number }>();
    for (const sub of gradedSubs) {
      const cid = assignmentToClassroom.get(sub.assignmentId);
      if (!cid) continue;
      const cur = classroomScores.get(cid) ?? { total: 0, count: 0 };
      cur.total += (Number(sub.totalScore!) / Number(sub.maxScore!)) * 100;
      cur.count += 1;
      classroomScores.set(cid, cur);
    }

    return new Map([...classroomScores.entries()].map(([id, v]) => [id, Math.round(v.total / v.count)]));
  }

  // ── Per-student search ───────────────────────────────────────────────────
  async getStudentsStats(q: string) {
    const where = q
      ? [{ fullName: ILike(`%${q}%`) }, { iin: ILike(`%${q}%`) }]
      : [];

    if (!q) return [];

    const students = await this.studentRepo.find({
      where,
      relations: { classroom: true, submissions: true, taskSubmissions: { assignment: true } },
      take: 20,
    });

    return students.map((s) => {
      const subjectMap = new Map<string, { total: number; count: number; topics: { topic: string; score: number; maxScore: number }[] }>();

      for (const ts of s.taskSubmissions ?? []) {
        if (!ts.assignment?.subject) continue;
        const subj = ts.assignment.subject;
        const cur = subjectMap.get(subj) ?? { total: 0, count: 0, topics: [] };
        if (ts.score != null) {
          cur.total += (Number(ts.score) / Number(ts.assignment.maxScore ?? 100)) * 100;
          cur.count += 1;
        }
        cur.topics.push({ topic: ts.assignment.title, score: ts.score ?? 0, maxScore: ts.assignment.maxScore ?? 100 });
        subjectMap.set(subj, cur);
      }

      for (const sub of s.submissions ?? []) {
        const cur = subjectMap.get(sub.topic) ?? { total: 0, count: 0, topics: [] };
        const pct = (Number(sub.score) / Number(sub.maxScore)) * 100;
        cur.total += pct; cur.count += 1;
        cur.topics.push({ topic: sub.topic, score: Number(sub.score), maxScore: Number(sub.maxScore) });
        subjectMap.set(sub.topic, cur);
      }

      const allScores = [...subjectMap.values()].flatMap((v) => v.topics.map((t) => (t.score / t.maxScore) * 100));
      const overallAvg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;

      return {
        id: s.id,
        fullName: s.fullName,
        iin: s.iin,
        classroom: s.classroom?.name ?? "—",
        overallAvg,
        subjects: [...subjectMap.entries()].map(([subject, v]) => ({
          subject,
          avgScore: v.count > 0 ? Math.round(v.total / v.count) : 0,
          topics: v.topics,
        })),
      };
    });
  }

  // ── Live summary for dashboard widgets ───────────────────────────────────
  async getLiveSummary(schoolId?: string) {
    const [totalClassrooms, totalTeachers] = await Promise.all([
      this.classroomRepo.count({ where: schoolId ? { schoolId } : undefined }),
      this.teacherRepo.count({
        where: schoolId
          ? [{ schoolId, role: "teacher" as const }, { schoolId, role: "class_teacher" as const }]
          : [{ role: "teacher" as const }, { role: "class_teacher" as const }],
      }),
    ]);

    const schoolStats = await this.getSchoolStats(undefined, schoolId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const assignmentsThisMonth = await this.assignmentRepo.count({
      where: schoolId
        ? { schoolId, createdAt: MoreThanOrEqual(monthStart) }
        : { createdAt: MoreThanOrEqual(monthStart) },
    });

    return {
      totalStudents: schoolStats.totalStudents,
      totalTeachers,
      totalClassrooms,
      avgScore: schoolStats.avgScore,
      submissionRate: schoolStats.submissionRate,
      assignmentsThisMonth,
    };
  }

  // ── AI analysis ──────────────────────────────────────────────────────────
  async aiAnalyze(stats: unknown, userCtx?: { schoolId?: string | null; userId?: string | null }): Promise<{ analysis: string }> {
    if (!this.aiClientService.isConfigured) {
      return { analysis: "ИИ-анализ недоступен. Проверьте настройку ANTHROPIC_API_KEY." };
    }

    const systemPrompt = buildPrompt('class_analysis', {
      class: '',
      subject: '',
      period: '',
      grades_json: JSON.stringify(stats || {}),
    });

    const result = await this.aiClientService.request({
      action: "analysis_class",
      systemPrompt,
      messages: [{ role: "user", content: "Выполни анализ." }],
    });

    this.tokenService?.deductTokens({
      schoolId: userCtx?.schoolId,
      userId: userCtx?.userId,
      inputTokens: result.tokensIn,
      outputTokens: result.tokensOut,
      actionType: "analytics_ai",
      model: result.model,
      costUsd: this.tokenService.calculateCost({ input_tokens: result.tokensIn, output_tokens: result.tokensOut }, result.model),
    }).catch(() => {});

    return { analysis: result.content || "Не удалось получить ответ." };
  }
}
