import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Teacher } from "../teachers/entities/teacher.entity";
import { Student } from "../schools/entities/student.entity";
import { Submission } from "../schools/entities/submission.entity";
import { GiftedPlan, GiftedPlanType } from "../schools/entities/gifted-plan.entity";
import { GiftedStudent } from "../schools/entities/gifted-student.entity";
import { GiftedTeacherAssignment } from "../schools/entities/gifted-teacher-assignment.entity";
import { GiftedMaterial, GiftedMaterialCategory } from "../schools/entities/gifted-material.entity";
import { GiftedAchievement } from "../schools/entities/gifted-achievement.entity";

@Injectable()
export class GiftedService {
  constructor(
    @InjectRepository(Teacher) private teacherRepo: Repository<Teacher>,
    @InjectRepository(Student) private studentRepo: Repository<Student>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(GiftedPlan) private planRepo: Repository<GiftedPlan>,
    @InjectRepository(GiftedStudent) private giftedStudentRepo: Repository<GiftedStudent>,
    @InjectRepository(GiftedTeacherAssignment) private assignmentRepo: Repository<GiftedTeacherAssignment>,
    @InjectRepository(GiftedMaterial) private materialRepo: Repository<GiftedMaterial>,
    @InjectRepository(GiftedAchievement) private achievementRepo: Repository<GiftedAchievement>,
  ) {}

  // ── Plans ──────────────────────────────────────────────────────────
  async getPlans(type?: string) {
    const where = type ? { type: type as GiftedPlanType } : {};
    return this.planRepo.find({
      where,
      relations: ["uploadedBy"],
      order: { createdAt: "DESC" },
    });
  }

  async createPlan(data: { type: string; title: string; fileUrl?: string; uploadedById: string }) {
    return this.planRepo.save(
      this.planRepo.create({
        type: data.type as GiftedPlanType,
        title: data.title,
        fileUrl: data.fileUrl,
        uploadedBy: { id: data.uploadedById } as Teacher,
      }),
    );
  }

  async removePlan(id: string) {
    await this.planRepo.delete(id);
    return { ok: true };
  }

  // ── Gifted students (school-wide list) ──────────────────────────────
  async getGiftedStudents(classroomId?: string) {
    const qb = this.giftedStudentRepo
      .createQueryBuilder("gs")
      .leftJoinAndSelect("gs.student", "student")
      .leftJoinAndSelect("student.classroom", "classroom")
      .leftJoinAndSelect("classroom.classTeacher", "classTeacher")
      .orderBy("student.fullName", "ASC");

    if (classroomId) {
      qb.where("classroom.id = :classroomId", { classroomId });
    }
    return qb.getMany();
  }

  async markGifted(studentId: string) {
    const exists = await this.giftedStudentRepo.findOne({
      where: { student: { id: studentId } },
    });
    if (exists) return exists;
    return this.giftedStudentRepo.save(
      this.giftedStudentRepo.create({ student: { id: studentId } as Student }),
    );
  }

  async removeGiftedStudent(id: string) {
    await this.giftedStudentRepo.delete(id);
    return { ok: true };
  }

  // ── Teachers ───────────────────────────────────────────────────────
  async getTeachers() {
    const teachers = await this.teacherRepo.find({
      where: { role: "teacher" },
      order: { fullName: "ASC" },
    });

    const [allAssignments, allMaterials] = await Promise.all([
      this.assignmentRepo.find({ relations: ["teacher"] }),
      this.materialRepo.find({ relations: ["teacher"] }),
    ]);

    return teachers.map((t) => ({
      id: t.id,
      fullName: t.fullName,
      subject: t.subject,
      experience: t.experience,
      category: t.category,
      giftedCount: allAssignments.filter((a) => a.teacher.id === t.id).length,
      materialCount: allMaterials.filter((m) => m.teacher.id === t.id).length,
    }));
  }

  async getTeacherStudents(teacherId: string) {
    return this.assignmentRepo
      .createQueryBuilder("ta")
      .leftJoinAndSelect("ta.student", "student")
      .leftJoinAndSelect("student.classroom", "classroom")
      .leftJoinAndSelect("classroom.classTeacher", "classTeacher")
      .where("ta.teacher = :teacherId", { teacherId })
      .orderBy("student.fullName", "ASC")
      .getMany();
  }

  async addTeacherAssignment(teacherId: string, studentId: string) {
    const exists = await this.assignmentRepo.findOne({
      where: { teacher: { id: teacherId }, student: { id: studentId } },
    });
    if (exists) return exists;
    return this.assignmentRepo.save(
      this.assignmentRepo.create({
        teacher: { id: teacherId } as Teacher,
        student: { id: studentId } as Student,
      }),
    );
  }

  async removeTeacherAssignment(id: string) {
    await this.assignmentRepo.delete(id);
    return { ok: true };
  }

  // ── Materials ──────────────────────────────────────────────────────
  async getMaterials(teacherId: string, category?: string) {
    const qb = this.materialRepo
      .createQueryBuilder("m")
      .where("m.teacher = :teacherId", { teacherId })
      .orderBy("m.createdAt", "DESC");
    if (category) qb.andWhere("m.category = :category", { category });
    return qb.getMany();
  }

  async addMaterial(data: {
    teacherId: string;
    category: string;
    title: string;
    fileUrl?: string;
    linkUrl?: string;
  }) {
    return this.materialRepo.save(
      this.materialRepo.create({
        teacher: { id: data.teacherId } as Teacher,
        category: data.category as GiftedMaterialCategory,
        title: data.title,
        fileUrl: data.fileUrl,
        linkUrl: data.linkUrl,
      }),
    );
  }

  async removeMaterial(id: string) {
    await this.materialRepo.delete(id);
    return { ok: true };
  }

  // ── Student card ───────────────────────────────────────────────────
  async getStudentCard(studentId: string) {
    const student = await this.studentRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.classroom", "classroom")
      .leftJoinAndSelect("classroom.classTeacher", "classTeacher")
      .leftJoinAndSelect("classroom.schedules", "schedule")
      .where("s.id = :studentId", { studentId })
      .getOne();

    if (!student) return null;

    const grades = await this.submissionRepo.find({
      where: { student: { id: studentId } },
      order: { submittedAt: "DESC" },
      take: 20,
    });

    const achievements = await this.achievementRepo.find({
      where: { student: { id: studentId } },
      order: { date: "DESC" },
    });

    const schedule = (student.classroom as unknown as { schedules?: unknown[] })?.schedules ?? [];

    return {
      id: student.id,
      fullName: student.fullName,
      classroom: {
        id: student.classroom.id,
        name: student.classroom.name,
        grade: student.classroom.grade,
        classTeacher: student.classroom.classTeacher
          ? { fullName: student.classroom.classTeacher.fullName }
          : null,
      },
      schedule,
      grades: grades.map((g) => ({
        topic: g.topic,
        score: Number(g.score),
        maxScore: Number(g.maxScore),
        submittedAt: g.submittedAt,
      })),
      achievements,
    };
  }

  // ── Achievements ───────────────────────────────────────────────────
  async addAchievement(data: {
    studentId: string;
    title: string;
    date?: string;
    level: string;
    subject?: string;
    place?: string;
  }) {
    return this.achievementRepo.save(
      this.achievementRepo.create({
        student: { id: data.studentId } as Student,
        title: data.title,
        date: data.date ? new Date(data.date) : undefined,
        level: data.level,
        subject: data.subject,
        place: data.place,
      }),
    );
  }

  async removeAchievement(id: string) {
    await this.achievementRepo.delete(id);
    return { ok: true };
  }

  // ── Search all students (for add-gifted modal) ─────────────────────
  async searchStudents(q?: string) {
    const qb = this.studentRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.classroom", "classroom")
      .orderBy("s.fullName", "ASC");
    if (q) qb.where("LOWER(s.fullName) LIKE :q", { q: `%${q.toLowerCase()}%` });
    return qb.getMany();
  }
}
