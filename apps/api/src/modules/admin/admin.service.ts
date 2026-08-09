import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Student } from "../schools/entities/student.entity";
import { Submission } from "../schools/entities/submission.entity";
import { GeneratedDocument } from "../schools/entities/generated-document.entity";
import { OpenLesson } from "../schools/entities/open-lesson.entity";
import { Protocol } from "../schools/entities/protocol.entity";
import { School } from "../schools/entities/school.entity";
import { SecurityAuditLog } from "../schools/entities/security-audit-log.entity";
import { Subscription } from "../billing/entities/subscription.entity";
import { SmsService } from "../notifications/sms.service";

/** Цена, проставляемая при ручной выдаче. Совпадает с PRICE_PER_MONTH в billing.service. */
const ADMIN_GRANT_PRICE = 2990;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(Classroom) private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Submission) private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(GeneratedDocument) private readonly docRepo: Repository<GeneratedDocument>,
    @InjectRepository(OpenLesson) private readonly lessonRepo: Repository<OpenLesson>,
    @InjectRepository(Protocol) private readonly protocolRepo: Repository<Protocol>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(SecurityAuditLog) private readonly auditRepo: Repository<SecurityAuditLog>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    private readonly smsService: SmsService,
  ) {}

  async getOverview(schoolId?: string | null) {
    const teacherWhere = schoolId ? { role: "teacher" as const, schoolId } : { role: "teacher" as const };
    const classroomWhere = schoolId ? { schoolId } : {};
    const lessonWhere = schoolId ? { schoolId } : {};
    const protocolWhere = schoolId ? { schoolId } : {};
    const pendingWhere = schoolId
      ? { status: "pending" as const, schoolId }
      : { status: "pending" as const };

    const [teachers, classrooms, documents, openLessons, protocols, pendingCount] = await Promise.all([
      this.teacherRepo.count({ where: teacherWhere }),
      this.classroomRepo.count({ where: classroomWhere }),
      schoolId
        ? this.docRepo.count({ where: { teacher: { schoolId } } })
        : this.docRepo.count(),
      this.lessonRepo.count({ where: lessonWhere }),
      this.protocolRepo.count({ where: protocolWhere }),
      this.teacherRepo.count({ where: pendingWhere }),
    ]);

    const studentWhere = schoolId ? { classroom: { schoolId } } : {};
    const students = await this.studentRepo.count({ where: studentWhere });

    // Optimized: replaced full table scan + JS reduce with AVG aggregate in DB
    const avgQb = this.submissionRepo
      .createQueryBuilder('sub')
      .select('AVG(CAST(sub.score AS float) / NULLIF(CAST(sub.maxScore AS float), 0))', 'avgRatio');
    if (schoolId) avgQb.where('sub.schoolId = :schoolId', { schoolId });
    const { avgRatio } = await avgQb.getRawOne<{ avgRatio: string | null }>() ?? { avgRatio: null };
    const avgScore = avgRatio != null ? Math.round(parseFloat(avgRatio) * 100) : 0;

    return { teachers, classrooms, students, avgScore, documents, openLessons, protocols, pendingCount };
  }

  async getSchoolAnalytics(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    // Optimized: load classrooms with teacher only (no students/submissions in memory)
    const classrooms = await this.classroomRepo.find({
      where,
      relations: { teacher: true },
      order: { grade: "ASC", name: "ASC" },
    });

    if (classrooms.length === 0) return [];
    const classroomIds = classrooms.map(c => c.id);

    // Optimized: student counts per classroom via COUNT in DB
    const studentCountsRaw = await this.studentRepo
      .createQueryBuilder('s')
      .innerJoin('s.classroom', 'c')
      .select('c.id', 'classroomId')
      .addSelect('COUNT(s.id)', 'count')
      .where('c.id IN (:...classroomIds)', { classroomIds })
      .groupBy('c.id')
      .getRawMany<{ classroomId: string; count: string }>();

    // Optimized: avg score per classroom via AVG in DB (sub → student → classroom)
    const avgScoresRaw = await this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin('sub.student', 's')
      .innerJoin('s.classroom', 'c')
      .select('c.id', 'classroomId')
      .addSelect('AVG(CAST(sub.score AS float) / NULLIF(CAST(sub.maxScore AS float), 0))', 'avgRatio')
      .where('c.id IN (:...classroomIds)', { classroomIds })
      .groupBy('c.id')
      .getRawMany<{ classroomId: string; avgRatio: string }>();

    const countMap = new Map(studentCountsRaw.map(r => [r.classroomId, parseInt(r.count)]));
    const avgMap = new Map(avgScoresRaw.map(r => [r.classroomId, r.avgRatio]));

    return classrooms.map((cls) => {
      const rawAvg = avgMap.get(cls.id);
      return {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        subject: cls.subject,
        teacher: cls.teacher?.fullName ?? "—",
        studentCount: countMap.get(cls.id) ?? 0,
        avgScore: rawAvg != null ? Math.round(parseFloat(rawAvg) * 100) : 0,
      };
    });
  }

  async getTeachersWithStats(schoolId?: string | null) {
    const where = schoolId
      ? { role: "teacher" as const, schoolId }
      : { role: "teacher" as const };

    // Optimized: replaced 4-level JOIN (teacher→classroom→student→submission) with
    // basic teacher load + 3 separate aggregated queries
    const teachers = await this.teacherRepo.find({
      where,
      order: { fullName: "ASC" },
    });

    if (teachers.length === 0) return [];
    const teacherIds = teachers.map(t => t.id);

    // Class + student counts per teacher via GROUP BY
    const classStatsRaw = await this.classroomRepo
      .createQueryBuilder('c')
      .innerJoin('c.teacher', 't')
      .leftJoin('c.students', 's')
      .select('t.id', 'teacherId')
      .addSelect('COUNT(DISTINCT c.id)', 'classCount')
      .addSelect('COUNT(DISTINCT s.id)', 'studentCount')
      .where('t.id IN (:...teacherIds)', { teacherIds })
      .groupBy('t.id')
      .getRawMany<{ teacherId: string; classCount: string; studentCount: string }>();

    // Avg submission score per teacher via AVG in DB
    const scoreStatsRaw = await this.submissionRepo
      .createQueryBuilder('sub')
      .innerJoin('sub.student', 's')
      .innerJoin('s.classroom', 'c')
      .innerJoin('c.teacher', 't')
      .select('t.id', 'teacherId')
      .addSelect('AVG(CAST(sub.score AS float) / NULLIF(CAST(sub.maxScore AS float), 0))', 'avgRatio')
      .where('t.id IN (:...teacherIds)', { teacherIds })
      .groupBy('t.id')
      .getRawMany<{ teacherId: string; avgRatio: string }>();

    // Document count per teacher via COUNT in DB
    const docStatsRaw = await this.docRepo
      .createQueryBuilder('d')
      .innerJoin('d.teacher', 't')
      .select('t.id', 'teacherId')
      .addSelect('COUNT(d.id)', 'docCount')
      .where('t.id IN (:...teacherIds)', { teacherIds })
      .groupBy('t.id')
      .getRawMany<{ teacherId: string; docCount: string }>();

    const classMap = new Map(classStatsRaw.map(r => [r.teacherId, r]));
    const scoreMap = new Map(scoreStatsRaw.map(r => [r.teacherId, r.avgRatio]));
    const docMap = new Map(docStatsRaw.map(r => [r.teacherId, parseInt(r.docCount)]));

    return teachers.map((t) => {
      const cs = classMap.get(t.id);
      const rawAvg = scoreMap.get(t.id);
      return {
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        subject: t.subject,
        experience: t.experience,
        category: t.category,
        classCount: cs ? parseInt(cs.classCount) : 0,
        studentCount: cs ? parseInt(cs.studentCount) : 0,
        avgScore: rawAvg != null ? Math.round(parseFloat(rawAvg) * 100) : 0,
        docCount: docMap.get(t.id) ?? 0,
      };
    });
  }

  private serializeTeacher(t: Teacher) {
    return {
      id: t.id,
      fullName: t.fullName,
      email: t.email,
      role: t.role,
      status: t.status,
      schoolName: t.schoolName,
      schoolId: t.schoolId,
      preferredLanguage: t.preferredLanguage,
      createdAt: t.createdAt,
    };
  }

  async getRegistrations(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    const rows = await this.teacherRepo.find({ where, order: { createdAt: "DESC" } });
    return rows.map((t) => this.serializeTeacher(t));
  }

  async approveRegistration(id: string, schoolId?: string) {
    const update: Partial<Teacher> = { status: "active" };
    if (schoolId) {
      const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
      update.schoolId = schoolId;
      update.schoolName = school?.name;
    }
    await this.teacherRepo.update(id, update);
    const t = await this.teacherRepo.findOne({ where: { id } });
    if (t?.phone) {
      await this.smsService.sendRegistrationApproved(t.phone, t.fullName, t.preferredLanguage as "ru" | "kz" | "en");
    }
    return t ? this.serializeTeacher(t) : null;
  }

  async rejectRegistration(id: string) {
    await this.teacherRepo.update(id, { status: "rejected" });
    const t = await this.teacherRepo.findOne({ where: { id } });
    return t ? this.serializeTeacher(t) : null;
  }

  async deactivateUser(id: string, requesterId: string) {
    if (id === requesterId) throw new ForbiddenException("Cannot deactivate your own account");
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    await this.teacherRepo.update(id, { status: "inactive" });
    return this.serializeTeacher({ ...user, status: "inactive" });
  }

  async activateUser(id: string) {
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    await this.teacherRepo.update(id, { status: "active" });
    return this.serializeTeacher({ ...user, status: "active" });
  }

  async deleteUser(id: string, requesterId: string, confirm: boolean) {
    if (!confirm) throw new BadRequestException("Deletion requires confirm=true");
    if (id === requesterId) throw new ForbiddenException("Cannot delete your own account");
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "admin") {
      const adminCount = await this.teacherRepo.count({ where: { role: "admin" } });
      if (adminCount <= 1) throw new ForbiddenException("Cannot delete the last admin account");
    }
    await this.teacherRepo.delete(id);
    return { ok: true };
  }

  async changeUserPassword(id: string, requesterId: string, newPassword: string) {
    if (id === requesterId) throw new ForbiddenException("Use the profile page to change your own password");
    if (!newPassword || newPassword.length < 6) throw new BadRequestException("Password must be at least 6 characters");
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("User not found");
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.teacherRepo.update(id, { passwordHash });
    return { ok: true };
  }

  /**
   * Перевод учителя между воронками B2C и B2G.
   *
   * Школа обязательна при переводе в B2G: jwt.strategy отказывает в доступе
   * любому не-администратору с воронкой не-b2c и без schoolId, поэтому перевод
   * без школы заблокировал бы человеку вход на следующем же запросе.
   *
   * Пробный период при переводе в B2C намеренно НЕ выдаётся — иначе смена
   * воронки через админку стала бы обходом защиты от повторного триала.
   */
  async changeFunnel(id: string, requesterId: string, target: "b2c" | "b2g", schoolId?: string | null) {
    if (target !== "b2c" && target !== "b2g") throw new BadRequestException("Воронка может быть только b2c или b2g");
    if (id === requesterId) throw new ForbiddenException("Нельзя менять воронку собственной учётной записи");

    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Пользователь не найден");
    if (user.role === "admin") throw new ForbiddenException("У администратора нет воронки");
    if (user.registrationSource === target) throw new BadRequestException("Пользователь уже в этой воронке");

    if (target === "b2g") {
      if (!schoolId) throw new BadRequestException("Для перевода в B2G нужно выбрать школу");
      const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
      if (!school) throw new NotFoundException("Школа не найдена");
      await this.teacherRepo.update(id, { registrationSource: "b2g", schoolId });
    } else {
      // В B2C учитель не принадлежит школе — связь снимаем.
      await this.teacherRepo.update(id, { registrationSource: "b2c", schoolId: null as unknown as string });
    }

    await this.auditRepo.save(this.auditRepo.create({
      eventType: "funnel_changed",
      details: `${user.email}: ${user.registrationSource} → ${target}${target === "b2g" ? ` (школа ${schoolId})` : ""}`,
      actorId: requesterId,
    } as never));

    return { ok: true, registrationSource: target, schoolId: target === "b2g" ? schoolId : null };
  }

  /**
   * Ручная выдача подписки администратором — для оплат мимо Kaspi
   * (наличные, счёт, промо). Продлевает от текущей даты окончания, если
   * подписка ещё действует, иначе от сегодняшнего дня.
   */
  async grantSubscription(id: string, requesterId: string, months: number) {
    if (!Number.isInteger(months) || months < 1 || months > 24) {
      throw new BadRequestException("Срок должен быть целым числом от 1 до 24 месяцев");
    }
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Пользователь не найден");
    if (user.registrationSource !== "b2c") {
      throw new BadRequestException("Подписка действует только в воронке B2C — доступ B2G даёт школа");
    }

    const now = new Date();
    let sub = await this.subscriptionRepo.findOne({ where: { teacherId: id } });
    const base = sub?.currentPeriodEnd && sub.currentPeriodEnd > now ? new Date(sub.currentPeriodEnd) : now;
    const end = new Date(base);
    end.setMonth(end.getMonth() + months);

    if (!sub) {
      sub = this.subscriptionRepo.create({ teacherId: id, currentPeriodStart: now });
    } else if (!sub.currentPeriodStart) {
      sub.currentPeriodStart = now;
    }
    sub.status = "active";
    sub.currentPeriodEnd = end;
    sub.pricePerMonth = ADMIN_GRANT_PRICE;
    sub.cancelAtPeriodEnd = false;
    await this.subscriptionRepo.save(sub);

    await this.auditRepo.save(this.auditRepo.create({
      eventType: "subscription_granted",
      details: `${user.email}: +${months} мес., действует до ${end.toISOString().slice(0, 10)}`,
      actorId: requesterId,
    } as never));

    return { ok: true, status: "active", currentPeriodEnd: end };
  }

  /** Отзыв выданного вручную доступа. Историю не трогаем — только закрываем период. */
  async revokeSubscription(id: string, requesterId: string) {
    const user = await this.teacherRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Пользователь не найден");
    const sub = await this.subscriptionRepo.findOne({ where: { teacherId: id } });
    if (!sub) throw new NotFoundException("У пользователя нет подписки");

    sub.status = "expired";
    sub.currentPeriodEnd = new Date();
    await this.subscriptionRepo.save(sub);

    await this.auditRepo.save(this.auditRepo.create({
      eventType: "subscription_revoked",
      details: `${user.email}: доступ отозван`,
      actorId: requesterId,
    } as never));

    return { ok: true, status: "expired" };
  }

  async getSecurityAuditLog(limit: number, eventType?: string) {
    const where = eventType ? { eventType } : {};
    return this.auditRepo.find({
      where,
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
