import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";

type Lang = "ru" | "kz" | "en";

const VIOLATION_NOTIFS: Record<Lang, {
  title: string;
  message: (description: string, points: number) => string;
}> = {
  ru: {
    title: "Зафиксировано замечание",
    message: (d, p) => `К вашему профилю добавлено замечание: ${d}. Вычтено баллов: ${p}`,
  },
  kz: {
    title: "Ескерту тіркелді",
    message: (d, p) => `Профиліңізге ескерту қосылды: ${d}. Шегерілген баллдар: ${p}`,
  },
  en: {
    title: "Violation Recorded",
    message: (d, p) => `A violation has been added to your profile: ${d}. Points deducted: ${p}`,
  },
};
import { NotificationsService } from "../notifications/notifications.service";
import { TeacherRating, RatingPeriod } from "../schools/entities/teacher-rating.entity";
import { TeacherViolation, ViolationType } from "../schools/entities/teacher-violation.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Assignment } from "../schools/entities/assignment.entity";
import { TaskSubmission } from "../schools/entities/task-submission.entity";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { GiftedTeacherAssignment } from "../schools/entities/gifted-teacher-assignment.entity";
import { GiftedAchievement } from "../schools/entities/gifted-achievement.entity";
import { UploadedFile } from "../schools/entities/uploaded-file.entity";
import { FLTask } from "../schools/entities/fl-task.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";
import { FLSubmission } from "../schools/entities/fl-submission.entity";

function getDateRange(period: RatingPeriod, periodNumber: number, academicYear: string): { start: Date; end: Date } {
  const [startYear] = academicYear.split("-").map(Number);
  const endYear = startYear + 1;
  if (period === "year") return { start: new Date(`${startYear}-09-01`), end: new Date(`${endYear}-06-30`) };
  if (period === "semester") {
    return periodNumber === 1
      ? { start: new Date(`${startYear}-09-01`), end: new Date(`${startYear}-12-31`) }
      : { start: new Date(`${endYear}-01-01`), end: new Date(`${endYear}-05-31`) };
  }
  // quarters
  const ranges: Record<number, { start: string; end: string }> = {
    1: { start: `${startYear}-09-01`, end: `${startYear}-10-31` },
    2: { start: `${startYear}-11-01`, end: `${startYear}-12-31` },
    3: { start: `${endYear}-01-10`, end: `${endYear}-03-21` },
    4: { start: `${endYear}-03-22`, end: `${endYear}-05-31` },
  };
  const r = ranges[periodNumber] ?? ranges[1];
  return { start: new Date(r.start), end: new Date(r.end) };
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function scoreForExperience(exp?: number): number {
  if (!exp) return 1;
  if (exp >= 20) return 10;
  if (exp >= 10) return 7;
  if (exp >= 5) return 5;
  if (exp >= 1) return 3;
  return 1;
}

function scoreForCategory(category?: string): number {
  switch (category?.toLowerCase()) {
    case "master": return 15;
    case "researcher": return 13;
    case "expert": return 11;
    case "highest": case "moderator": return 8;
    case "first": case "pedagog": return 5;
    case "second": case "stazher": return 2;
    default: return 0;
  }
}

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(TeacherRating) private ratingRepo: Repository<TeacherRating>,
    @InjectRepository(TeacherViolation) private violationRepo: Repository<TeacherViolation>,
    @InjectRepository(Teacher) private teacherRepo: Repository<Teacher>,
    @InjectRepository(Assignment) private assignmentRepo: Repository<Assignment>,
    @InjectRepository(TaskSubmission) private submissionRepo: Repository<TaskSubmission>,
    @InjectRepository(OpenLesson) private lessonRepo: Repository<OpenLesson>,
    @InjectRepository(GiftedTeacherAssignment) private giftedAssignRepo: Repository<GiftedTeacherAssignment>,
    @InjectRepository(GiftedAchievement) private achievementRepo: Repository<GiftedAchievement>,
    @InjectRepository(UploadedFile) private fileRepo: Repository<UploadedFile>,
    @InjectRepository(FLTask) private flTaskRepo: Repository<FLTask>,
    @InjectRepository(FLAssignment) private flAssignRepo: Repository<FLAssignment>,
    @InjectRepository(FLSubmission) private flSubmissionRepo: Repository<FLSubmission>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async calculateTeacherScore(
    teacher: Teacher,
    schoolId: string,
    period: RatingPeriod,
    periodNumber: number,
    academicYear: string,
  ): Promise<Omit<TeacherRating, "id" | "createdAt" | "updatedAt" | "teacher">> {
    const { start, end } = getDateRange(period, periodNumber, academicYear);

    // ── 1. Experience ─────────────────────────────────────────────────
    const scoreExperience = scoreForExperience(teacher.experience);

    // ── 2. Category ───────────────────────────────────────────────────
    const scoreCategory = scoreForCategory(teacher.category);

    // ── 3. Academic (avg task submission score) ───────────────────────
    const assignments = await this.assignmentRepo
      .createQueryBuilder("a")
      .where("a.teacher = :tid", { tid: teacher.id })
      .andWhere("a.schoolId = :sid", { sid: schoolId })
      .getMany();

    let scoreAcademic = 12; // neutral if no data
    if (assignments.length > 0) {
      const aIds = assignments.map(a => a.id);
      const subs = await this.submissionRepo
        .createQueryBuilder("ts")
        .leftJoinAndSelect("ts.assignment", "a")
        .where("ts.assignment IN (:...aIds)", { aIds })
        .andWhere("ts.status = 'graded'")
        .andWhere("ts.submittedAt BETWEEN :start AND :end", { start, end })
        .getMany();

      if (subs.length > 0) {
        const pct = subs.reduce((sum, s) => {
          const maxScore = (s.assignment as Assignment & { maxScore: number })?.maxScore ?? 100;
          return sum + ((s.score ?? 0) / maxScore) * 100;
        }, 0) / subs.length;
        if (pct >= 90) scoreAcademic = 25;
        else if (pct >= 75) scoreAcademic = 20;
        else if (pct >= 60) scoreAcademic = 15;
        else if (pct >= 45) scoreAcademic = 10;
        else scoreAcademic = 5;
      }
    }

    // ── 4. FL Literacy ────────────────────────────────────────────────
    const flAssignments = await this.flAssignRepo
      .createQueryBuilder("fa")
      .where("fa.teacherId = :tid", { tid: teacher.id })
      .andWhere("fa.schoolId = :sid", { sid: schoolId })
      .getMany();

    let scoreFLiteracy = 7; // neutral
    if (flAssignments.length > 0) {
      const faIds = flAssignments.map(a => a.id);
      const flSubs = await this.flSubmissionRepo
        .createQueryBuilder("fs")
        .where("fs.assignmentId IN (:...faIds)", { faIds })
        .andWhere("fs.status = 'graded'")
        .andWhere("fs.submittedAt BETWEEN :start AND :end", { start, end })
        .getMany();

      if (flSubs.length > 0) {
        const gradedWithScore = flSubs.filter(s => s.totalScore !== null && s.totalScore !== undefined && s.maxScore);
        if (gradedWithScore.length > 0) {
          const pct = gradedWithScore.reduce((sum, s) => sum + ((s.totalScore ?? 0) / (s.maxScore ?? 100)) * 100, 0) / gradedWithScore.length;
          if (pct >= 90) scoreFLiteracy = 15;
          else if (pct >= 75) scoreFLiteracy = 12;
          else if (pct >= 60) scoreFLiteracy = 9;
          else if (pct >= 45) scoreFLiteracy = 6;
          else scoreFLiteracy = 3;
        }
      }
    }

    // ── 5. Open Lessons ───────────────────────────────────────────────
    const lessons = await this.lessonRepo
      .createQueryBuilder("ol")
      .where("ol.teacher = :tid", { tid: teacher.id })
      .andWhere("ol.schoolId = :sid", { sid: schoolId })
      .andWhere("ol.status = 'conducted'")
      .andWhere("ol.date BETWEEN :start AND :end", { start, end })
      .getMany();

    const lessonCount = lessons.length;
    let scoreOpenLessons: number;
    if (lessonCount >= 5) scoreOpenLessons = 10;
    else if (lessonCount >= 3) scoreOpenLessons = 7;
    else if (lessonCount >= 1) scoreOpenLessons = 5;
    else scoreOpenLessons = 0;

    // ── 6. Achievements ───────────────────────────────────────────────
    const giftedLinks = await this.giftedAssignRepo
      .createQueryBuilder("gta")
      .where("gta.teacher = :tid", { tid: teacher.id })
      .getMany();

    let scoreAchievements = 0;
    if (giftedLinks.length > 0) {
      const studentIds = giftedLinks.map(g => (g.student as { id: string }).id).filter(Boolean);
      if (studentIds.length > 0) {
        const achievementCount = await this.achievementRepo
          .createQueryBuilder("ga")
          .where("ga.student IN (:...studentIds)", { studentIds })
          .andWhere("ga.date BETWEEN :start AND :end", { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) })
          .getCount();

        if (achievementCount >= 10) scoreAchievements = 10;
        else if (achievementCount >= 5) scoreAchievements = 7;
        else if (achievementCount >= 2) scoreAchievements = 5;
        else if (achievementCount >= 1) scoreAchievements = 3;
      }
    }

    // ── 7. Activity (platform usage) ──────────────────────────────────
    const [ktpFiles, assignmentCount, lessonTotal, flTaskCount] = await Promise.all([
      this.fileRepo.createQueryBuilder("f")
        .where("f.uploadedBy = :tid", { tid: teacher.id })
        .andWhere("(f.section LIKE 'teacher-ktp-%' OR f.section LIKE 'teacher-ksp-%')")
        .andWhere("f.createdAt BETWEEN :start AND :end", { start, end })
        .getCount(),
      this.assignmentRepo.createQueryBuilder("a")
        .where("a.teacher = :tid", { tid: teacher.id })
        .andWhere("a.createdAt BETWEEN :start AND :end", { start, end })
        .getCount(),
      this.lessonRepo.createQueryBuilder("ol")
        .where("ol.teacher = :tid", { tid: teacher.id })
        .andWhere("ol.createdAt BETWEEN :start AND :end", { start, end })
        .getCount(),
      this.flTaskRepo.createQueryBuilder("ft")
        .where("ft.teacherId = :tid", { tid: teacher.id })
        .andWhere("ft.createdAt BETWEEN :start AND :end", { start, end })
        .getCount(),
    ]);

    const totalActions = ktpFiles + assignmentCount + lessonTotal + flTaskCount;
    let scoreActivity: number;
    if (totalActions >= 50) scoreActivity = 10;
    else if (totalActions >= 30) scoreActivity = 8;
    else if (totalActions >= 15) scoreActivity = 6;
    else if (totalActions >= 5) scoreActivity = 4;
    else scoreActivity = 2;

    // ── 8. Violations ─────────────────────────────────────────────────
    const violations = await this.violationRepo
      .createQueryBuilder("v")
      .where("v.teacher = :tid", { tid: teacher.id })
      .andWhere("v.schoolId = :sid", { sid: schoolId })
      .andWhere("v.date BETWEEN :start AND :end", { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) })
      .getMany();

    const deducted = violations.reduce((sum, v) => sum + (v.pointsDeducted ?? 0), 0);
    const scoreViolations = clamp(5 - deducted, 0, 5);

    // ── Total ─────────────────────────────────────────────────────────
    const rawTotal = scoreExperience + scoreCategory + scoreAcademic + scoreFLiteracy + scoreOpenLessons + scoreAchievements + scoreActivity + scoreViolations;

    return {
      schoolId,
      period,
      periodNumber,
      academicYear,
      scoreExperience: Math.round(scoreExperience * 10) / 10,
      scoreCategory: Math.round(scoreCategory * 10) / 10,
      scoreAcademic: Math.round(scoreAcademic * 10) / 10,
      scoreFLiteracy: Math.round(scoreFLiteracy * 10) / 10,
      scoreOpenLessons: Math.round(scoreOpenLessons * 10) / 10,
      scoreAchievements: Math.round(scoreAchievements * 10) / 10,
      scoreActivity: Math.round(scoreActivity * 10) / 10,
      scoreViolations: Math.round(scoreViolations * 10) / 10,
      manualAdjustment: 0,
      manualComment: undefined,
      totalScore: Math.round(clamp(rawTotal, 0, 100) * 10) / 10,
    };
  }

  // ── Public methods ─────────────────────────────────────────────────────────
  async calculateAll(schoolId: string, period: RatingPeriod = "year", periodNumber = 0, academicYear = "2025-2026") {
    const teachers = await this.teacherRepo.find({
      where: { schoolId, status: "active" },
    });

    if (teachers.length === 0) return { calculated: 0, period, periodNumber, academicYear };

    // Optimized: replaced N findOne + N save with one bulk load + one bulk save
    const existingRatings = await this.ratingRepo.find({
      where: { schoolId, period, periodNumber, academicYear },
      relations: { teacher: true },
    });
    const existingMap = new Map(existingRatings.map(r => [r.teacher.id, r]));

    const ratingsToSave = await Promise.all(
      teachers.map(async (teacher) => {
        const scores = await this.calculateTeacherScore(teacher, schoolId, period, periodNumber, academicYear);
        const existing = existingMap.get(teacher.id);
        const manualAdj = existing?.manualAdjustment ?? 0;
        const manualComment = existing?.manualComment;
        const totalWithAdj = Math.round(clamp(scores.totalScore + manualAdj, 0, 100) * 10) / 10;

        if (existing) {
          Object.assign(existing, { ...scores, manualAdjustment: manualAdj, manualComment, totalScore: totalWithAdj });
          return existing;
        }
        return this.ratingRepo.create({ ...scores, totalScore: totalWithAdj, teacher: { id: teacher.id } as Teacher });
      })
    );

    await this.ratingRepo.save(ratingsToSave);
    return { calculated: ratingsToSave.length, period, periodNumber, academicYear };
  }

  async getSchoolRatings(schoolId: string, filters: {
    subject?: string; period?: RatingPeriod; periodNumber?: number;
    academicYear?: string; isClassTeacher?: boolean;
  }) {
    const period = filters.period ?? "year";
    const periodNumber = filters.periodNumber ?? 0;
    const academicYear = filters.academicYear ?? "2025-2026";

    const qb = this.ratingRepo.createQueryBuilder("r")
      .leftJoinAndSelect("r.teacher", "t")
      .where("r.schoolId = :schoolId", { schoolId })
      .andWhere("r.period = :period", { period })
      .andWhere("r.periodNumber = :periodNumber", { periodNumber })
      .andWhere("r.academicYear = :academicYear", { academicYear })
      .orderBy("r.totalScore", "DESC");

    const ratings = await qb.getMany();

    return ratings
      .filter(r => {
        if (filters.subject && r.teacher?.subject !== filters.subject) return false;
        if (filters.isClassTeacher !== undefined && r.teacher?.isClassTeacher !== filters.isClassTeacher) return false;
        return true;
      })
      .map((r, idx) => ({
        rank: idx + 1,
        id: r.id,
        teacherId: r.teacher?.id,
        teacherName: r.teacher?.fullName ?? "—",
        subject: r.teacher?.subject,
        category: r.teacher?.category,
        isClassTeacher: r.teacher?.isClassTeacher,
        totalScore: r.totalScore,
        scoreExperience: r.scoreExperience,
        scoreCategory: r.scoreCategory,
        scoreAcademic: r.scoreAcademic,
        scoreFLiteracy: r.scoreFLiteracy,
        scoreOpenLessons: r.scoreOpenLessons,
        scoreAchievements: r.scoreAchievements,
        scoreActivity: r.scoreActivity,
        scoreViolations: r.scoreViolations,
        manualAdjustment: r.manualAdjustment,
        manualComment: r.manualComment,
        period: r.period,
        periodNumber: r.periodNumber,
        academicYear: r.academicYear,
      }));
  }

  async getTeacherRating(teacherId: string, schoolId: string, period: RatingPeriod = "year", periodNumber = 0, academicYear = "2025-2026") {
    const rating = await this.ratingRepo.findOne({
      where: { teacher: { id: teacherId }, schoolId, period, periodNumber, academicYear },
      relations: ["teacher"],
    });
    if (!rating) return null;

    const allRatings = await this.ratingRepo.find({ where: { schoolId, period, periodNumber, academicYear }, order: { totalScore: "DESC" } });
    const rank = allRatings.findIndex(r => r.teacher?.id === teacherId) + 1;
    const total = allRatings.length;
    const top10Score = allRatings[9]?.totalScore ?? null;
    const pointsToTop10 = top10Score !== null && rating.totalScore < top10Score ? Math.round((top10Score - rating.totalScore) * 10) / 10 : null;

    return { ...rating, rank, total, pointsToTop10 };
  }

  async getRatingHistory(teacherId: string, schoolId: string) {
    return this.ratingRepo.find({
      where: { teacher: { id: teacherId }, schoolId },
      order: { academicYear: "DESC", period: "ASC", periodNumber: "ASC" },
    });
  }

  async adjustRating(id: string, data: { manualAdjustment: number; manualComment?: string }) {
    const rating = await this.ratingRepo.findOne({ where: { id } });
    if (!rating) return null;
    rating.manualAdjustment = data.manualAdjustment;
    rating.manualComment = data.manualComment;
    rating.totalScore = Math.round(clamp(rating.totalScore - (rating.manualAdjustment ?? 0) + data.manualAdjustment, 0, 100) * 10) / 10;
    return this.ratingRepo.save(rating);
  }

  // ── Violations ─────────────────────────────────────────────────────────────
  async createViolation(data: {
    teacherId: string; schoolId: string; type: ViolationType;
    description: string; date: string; pointsDeducted: number; createdBy: string;
    lang?: Lang;
  }) {
    const violation = await this.violationRepo.save(
      this.violationRepo.create({ ...data, teacher: { id: data.teacherId } as Teacher })
    );

    const n = VIOLATION_NOTIFS[data.lang ?? "ru"];
    await this.notificationsService.createNotification({
      teacherId: data.teacherId,
      schoolId: data.schoolId,
      type: "violation",
      title: n.title,
      message: n.message(data.description, data.pointsDeducted),
    });

    return violation;
  }

  async getViolations(teacherId: string, schoolId: string) {
    return this.violationRepo.find({
      where: { teacher: { id: teacherId }, schoolId },
      order: { date: "DESC" },
    });
  }

  async getViolationsByTeacherId(teacherId: string) {
    return this.violationRepo.find({
      where: { teacher: { id: teacherId } },
      order: { date: "DESC" },
    });
  }

  async deleteViolation(id: string, schoolId?: string | null) {
    const res = await this.violationRepo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException();
    return { ok: true };
  }
}
