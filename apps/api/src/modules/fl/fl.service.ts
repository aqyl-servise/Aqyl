import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FLTask } from "../schools/entities/fl-task.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";
import { FLSubmission, FLAnswer } from "../schools/entities/fl-submission.entity";
import { FLResult } from "../schools/entities/fl-result.entity";
import { FLAnalyticsCache } from "../schools/entities/fl-analytics-cache.entity";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { AiChatService } from "../ai/ai.service";

@Injectable()
export class FLService {
  constructor(
    @InjectRepository(FLTask) private taskRepo: Repository<FLTask>,
    @InjectRepository(FLAssignment) private assignmentRepo: Repository<FLAssignment>,
    @InjectRepository(FLSubmission) private submissionRepo: Repository<FLSubmission>,
    @InjectRepository(FLResult) private resultRepo: Repository<FLResult>,
    @InjectRepository(FLAnalyticsCache) private analyticsCacheRepo: Repository<FLAnalyticsCache>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(Classroom) private classroomRepo: Repository<Classroom>,
    @InjectRepository(Teacher) private teacherRepo: Repository<Teacher>,
    private readonly aiService: AiChatService,
  ) {}

  // ── Tasks ──────────────────────────────────────────────────────────────
  async getTasks(schoolId: string, filters: {
    subject?: string; grade?: number; direction?: string;
    difficulty?: string; source?: string;
  }) {
    const qb = this.taskRepo.createQueryBuilder("t")
      .where("(t.schoolId = :schoolId OR t.schoolId IS NULL)", { schoolId })
      .orderBy("t.createdAt", "DESC");
    if (filters.subject) qb.andWhere("t.subject = :subject", { subject: filters.subject });
    if (filters.grade) qb.andWhere("t.grade = :grade", { grade: filters.grade });
    if (filters.direction) qb.andWhere("t.direction = :direction", { direction: filters.direction });
    if (filters.difficulty) qb.andWhere("t.difficulty = :difficulty", { difficulty: filters.difficulty });
    if (filters.source) qb.andWhere("t.source = :source", { source: filters.source });
    return qb.getMany();
  }

  async createTask(data: Partial<FLTask> & { schoolId: string; teacherId: string }) {
    return this.taskRepo.save(this.taskRepo.create(data));
  }

  async updateTask(id: string, teacherId: string, data: Partial<FLTask>) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException();
    if (task.teacherId && task.teacherId !== teacherId) throw new ForbiddenException();
    Object.assign(task, data);
    return this.taskRepo.save(task);
  }

  async deleteTask(id: string, teacherId: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException();
    if (task.teacherId && task.teacherId !== teacherId) throw new ForbiddenException();
    await this.taskRepo.delete(id);
    return { ok: true };
  }

  // ── Assignments ────────────────────────────────────────────────────────
  async getAssignments(teacherId: string, schoolId: string, classroomId?: string) {
    const qb = this.assignmentRepo.createQueryBuilder("a")
      .where("a.teacherId = :teacherId", { teacherId })
      .andWhere("a.schoolId = :schoolId", { schoolId })
      .orderBy("a.createdAt", "DESC");
    if (classroomId) qb.andWhere("a.classroomId = :classroomId", { classroomId });
    return qb.getMany();
  }

  async createAssignment(data: Partial<FLAssignment> & { teacherId: string; schoolId: string }) {
    return this.assignmentRepo.save(this.assignmentRepo.create(data));
  }

  async updateAssignment(id: string, teacherId: string, data: Partial<FLAssignment>) {
    const a = await this.assignmentRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException();
    if (a.teacherId !== teacherId) throw new ForbiddenException();
    Object.assign(a, data);
    return this.assignmentRepo.save(a);
  }

  async publishAssignment(id: string, teacherId: string) {
    return this.updateAssignment(id, teacherId, { status: "published" } as Partial<FLAssignment>);
  }

  async closeAssignment(id: string, teacherId: string) {
    const assignment = await this.updateAssignment(id, teacherId, { status: "closed" } as Partial<FLAssignment>);
    await this.recalculateAnalytics(assignment.schoolId);
    return assignment;
  }

  // ── Submissions ────────────────────────────────────────────────────────
  async getSubmissions(assignmentId: string) {
    const subs = await this.submissionRepo.find({ where: { assignmentId }, order: { createdAt: "ASC" } });
    const studentIds = [...new Set(subs.map(s => s.studentId))];
    const students = studentIds.length > 0
      ? await this.studentRepo.createQueryBuilder("s").where("s.id IN (:...ids)", { ids: studentIds }).getMany()
      : [];
    const studentMap = new Map(students.map(s => [s.id, s]));
    return subs.map(sub => ({
      ...sub,
      student: studentMap.get(sub.studentId) ?? { id: sub.studentId, fullName: "—" },
    }));
  }

  async submitAnswers(assignmentId: string, userId: string, answers: { taskId: string; answer: string }[]) {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("Student not found");
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException("Assignment not found");
    let sub = await this.submissionRepo.findOne({ where: { assignmentId, studentId: student.id } });
    if (!sub) {
      sub = this.submissionRepo.create({ assignmentId, studentId: student.id, answers: [], status: "in_progress" });
    }
    sub.answers = answers as FLAnswer[];
    sub.status = "submitted";
    sub.submittedAt = new Date();
    const result = await this.submissionRepo.save(sub);
    await this.recalculateAnalytics(assignment.schoolId);
    return result;
  }

  async gradeSubmission(id: string, data: {
    answers: { taskId: string; score?: number; teacherComment?: string }[];
    totalScore?: number;
  }) {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException();
    sub.answers = sub.answers.map(a => {
      const g = data.answers.find(x => x.taskId === a.taskId);
      return g ? { ...a, score: g.score, teacherComment: g.teacherComment } : a;
    });
    if (data.totalScore !== undefined) sub.totalScore = data.totalScore;
    sub.status = "graded";
    sub.gradedAt = new Date();
    const result = await this.submissionRepo.save(sub);
    const assignment = await this.assignmentRepo.findOne({ where: { id: sub.assignmentId } });
    if (assignment) await this.recalculateAnalytics(assignment.schoolId);
    return result;
  }

  // ── Analytics ──────────────────────────────────────────────────────────
  async getSchoolAnalytics(schoolId: string) {
    const cache = await this.analyticsCacheRepo.findOne({ where: { schoolId } });
    if (cache) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (cache.updatedAt > fiveMinutesAgo) return cache.data;
    }
    return this.recalculateAnalytics(schoolId);
  }

  private async recalculateAnalytics(schoolId: string): Promise<object> {
    const [results, assignments] = await Promise.all([
      this.resultRepo.find({ where: { schoolId } }),
      this.assignmentRepo.find({ where: { schoolId } }),
    ]);

    const directions = ["reading", "math", "science"] as const;
    const directionStats = directions.map(dir => {
      const dr = results.filter(r => r.direction === dir);
      const avg = dr.length > 0 ? dr.reduce((s, r) => s + r.score, 0) / dr.length : 0;
      return { direction: dir, avg: Math.round(avg * 10) / 10, count: dr.length };
    });

    const classroomIds = [...new Set(assignments.map(a => a.classroomId))];
    const classrooms = classroomIds.length > 0
      ? await this.classroomRepo.createQueryBuilder("c").where("c.id IN (:...ids)", { ids: classroomIds }).getMany()
      : [];

    const classroomStats = classrooms.map(c => {
      const cr = results.filter(r => r.classroomId === c.id);
      const avg = cr.length > 0 ? cr.reduce((s, r) => s + r.score, 0) / cr.length : 0;
      const getDir = (dir: string) => {
        const dr = cr.filter(r => r.direction === dir);
        return dr.length > 0 ? Math.round(dr.reduce((s, r) => s + r.score, 0) / dr.length * 10) / 10 : null;
      };
      return { classroomId: c.id, classroomName: c.name, avg: Math.round(avg * 10) / 10, reading: getDir("reading"), math: getDir("math"), science: getDir("science") };
    });

    const teacherIds = [...new Set(assignments.map(a => a.teacherId))];
    const teachers = teacherIds.length > 0
      ? await this.teacherRepo.createQueryBuilder("t").where("t.id IN (:...ids)", { ids: teacherIds }).getMany()
      : [];

    const submissions = assignments.length > 0
      ? await this.submissionRepo.createQueryBuilder("s")
          .where("s.assignmentId IN (:...ids)", { ids: assignments.map(a => a.id) })
          .andWhere("s.status = 'graded'")
          .getMany()
      : [];

    const totalAssignments = assignments.length;
    const closedAssignments = assignments.filter(a => a.status === "closed").length;
    const completionRate = totalAssignments > 0 ? Math.round(closedAssignments / totalAssignments * 100) : 0;

    const teacherStats = teacherIds.map(tid => {
      const teacher = teachers.find(t => t.id === tid);
      const ta = assignments.filter(a => a.teacherId === tid);
      const ts = submissions.filter(s => ta.some(a => a.id === s.assignmentId));
      const avg = ts.length > 0 ? ts.reduce((s, x) => s + (x.totalScore ?? 0), 0) / ts.length : 0;
      return { teacherId: tid, teacherName: teacher?.fullName ?? "—", assignmentsCount: ta.length, avgStudentScore: Math.round(avg * 10) / 10 };
    }).sort((a, b) => b.assignmentsCount - a.assignmentsCount);

    const data = { directionStats, classroomStats, teacherStats, completionRate, totalAssignments };

    let cache = await this.analyticsCacheRepo.findOne({ where: { schoolId } });
    if (!cache) cache = this.analyticsCacheRepo.create({ schoolId });
    cache.data = data;
    await this.analyticsCacheRepo.save(cache);

    return data;
  }

  async getClassAnalytics(classroomId: string) {
    const [results, assignments, students] = await Promise.all([
      this.resultRepo.find({ where: { classroomId } }),
      this.assignmentRepo.find({ where: { classroomId } }),
      this.studentRepo.createQueryBuilder("s").leftJoinAndSelect("s.classroom", "c").where("c.id = :classroomId", { classroomId }).getMany(),
    ]);

    const studentIds = students.map(s => s.id);
    const submissions = studentIds.length > 0
      ? await this.submissionRepo.createQueryBuilder("s").where("s.studentId IN (:...ids)", { ids: studentIds }).getMany()
      : [];

    const studentStats = students.map(s => {
      const sr = results.filter(r => r.studentId === s.id);
      const getDir = (dir: string) => {
        const dr = sr.filter(r => r.direction === dir);
        return dr.length > 0 ? Math.round(dr.reduce((x, r) => x + r.score, 0) / dr.length * 10) / 10 : null;
      };
      return { studentId: s.id, fullName: s.fullName, reading: getDir("reading"), math: getDir("math"), science: getDir("science"), totalSubmissions: submissions.filter(x => x.studentId === s.id).length };
    });

    return { classroomId, studentStats, totalAssignments: assignments.length };
  }

  async getStudentAnalytics(studentId: string) {
    const [results, submissions] = await Promise.all([
      this.resultRepo.find({ where: { studentId }, order: { createdAt: "DESC" } }),
      this.submissionRepo.find({ where: { studentId }, order: { createdAt: "DESC" }, take: 20 }),
    ]);
    return { studentId, results, submissions };
  }

  // ── Student portal ─────────────────────────────────────────────────────
  async getStudentAssignments(userId: string) {
    const student = await this.studentRepo.findOne({ where: { userId }, relations: ["classroom"] });
    if (!student) return [];
    const assignments = await this.assignmentRepo.find({ where: { classroomId: student.classroom.id, status: "published" }, order: { createdAt: "DESC" } });
    const submissions = await this.submissionRepo.find({ where: { studentId: student.id } });
    const subMap = new Map(submissions.map(s => [s.assignmentId, s]));
    return assignments.map(a => ({ ...a, submission: subMap.get(a.id) ?? null }));
  }

  async getStudentAssignmentDetail(assignmentId: string, userId: string) {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("Student not found");
    const assignment = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException("Assignment not found");
    const taskIds = (assignment.tasks ?? []) as string[];
    const tasks = taskIds.length > 0
      ? await this.taskRepo.createQueryBuilder("t").where("t.id IN (:...ids)", { ids: taskIds }).getMany()
      : [];
    const submission = await this.submissionRepo.findOne({ where: { assignmentId, studentId: student.id } });
    return { ...assignment, taskObjects: tasks, submission };
  }

  async startAssignment(assignmentId: string, userId: string) {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("Student not found");
    let sub = await this.submissionRepo.findOne({ where: { assignmentId, studentId: student.id } });
    if (sub) return sub;
    sub = this.submissionRepo.create({ assignmentId, studentId: student.id, answers: [], status: "in_progress", startedAt: new Date() });
    return this.submissionRepo.save(sub);
  }

  async updateSubmission(id: string, userId: string, data: { answers?: { taskId: string; answer: string }[] }) {
    const student = await this.studentRepo.findOne({ where: { userId } });
    if (!student) throw new NotFoundException("Student not found");
    const sub = await this.submissionRepo.findOne({ where: { id, studentId: student.id } });
    if (!sub) throw new NotFoundException("Submission not found");
    if (data.answers) sub.answers = data.answers as FLAnswer[];
    return this.submissionRepo.save(sub);
  }

  // ── AI ─────────────────────────────────────────────────────────────────
  async generateTask(body: { subject: string; grade: number; direction: string; difficulty: string; taskType: string; topic: string }, userCtx?: { userId: string; schoolId: string; role: string }) {
    return this.aiService.generateFLTask(body, userCtx);
  }
}
