import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";

type AnalyticsRow = {
  student: string; classroom: string; topic: string; score: number; maxScore: number;
};

@Injectable()
export class AnalyticsService {
  private readonly ai?: Anthropic;

  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Classroom)
    private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission)
    private readonly tsRepo: Repository<TaskSubmission>,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (key) this.ai = new Anthropic({ apiKey: key });
  }

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
  async getSchoolStats(teacherClassroomIds?: string[]) {
    const classroomWhere = teacherClassroomIds
      ? teacherClassroomIds.map((id) => ({ id }))
      : undefined;

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

    // By subject (from TaskSubmissions)
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

    // Submission completion rate
    const allAssignments = await this.assignmentRepo.count(
      teacherClassroomIds ? { where: teacherClassroomIds.map((id) => ({ classroom: { id } })) } : undefined
    );
    const submittedCount = await this.tsRepo.count({ where: [{ status: "submitted" }, { status: "graded" }] });
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
  async getClassesStats(teacherClassroomIds?: string[]) {
    const classroomWhere = teacherClassroomIds
      ? teacherClassroomIds.map((id) => ({ id }))
      : undefined;

    const classrooms = await this.classroomRepo.find({
      where: classroomWhere,
      relations: { students: { submissions: true, taskSubmissions: { assignment: true } }, teacher: true, classTeacher: true },
      order: { grade: "ASC", name: "ASC" },
    });

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
        students: students.sort((a, b) => b.avgScore - a.avgScore),
      };
    });
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

  // ── AI analysis ──────────────────────────────────────────────────────────
  async aiAnalyze(stats: unknown): Promise<{ analysis: string }> {
    if (!this.ai) {
      return { analysis: "ИИ-анализ недоступен. Проверьте настройку ANTHROPIC_API_KEY." };
    }
    const model = this.configService.get<string>("ANTHROPIC_MODEL") ?? "claude-haiku-4-5-20251001";
    const prompt = `Ты аналитик успеваемости казахстанской школы. Проанализируй данные и дай структурированный отчёт на русском языке.

Данные успеваемости школы:
${JSON.stringify(stats, null, 2)}

Твой анализ должен включать:
1. **Общая картина** — общий средний балл, количество учеников и классов
2. **Сильные стороны** — лучшие классы и предметы
3. **Зоны риска** — слабые классы, предметы и ученики (если есть)
4. **Рекомендации учителям** — конкретные действия
5. **Прогноз** — что произойдёт если не принять меры

Отвечай чётко, используй маркированные списки и заголовки. Максимум 600 слов.`;

    const response = await this.ai.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = response.content[0].type === "text" ? response.content[0].text : "Не удалось получить ответ.";
    return { analysis };
  }
}
