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
  ) {}

  async getOverview() {
    const [teachers, classrooms, students, submissions, documents, openLessons, protocols, pendingCount] = await Promise.all([
      this.teacherRepo.count({ where: { role: "teacher" } }),
      this.classroomRepo.count(),
      this.studentRepo.count(),
      this.submissionRepo.find(),
      this.docRepo.count(),
      this.lessonRepo.count(),
      this.protocolRepo.count(),
      this.teacherRepo.count({ where: { status: "pending" } }),
    ]);

    const avgScore = submissions.length
      ? Math.round(submissions.reduce((s, sub) => s + Number(sub.score) / Number(sub.maxScore), 0) / submissions.length * 100)
      : 0;

    return { teachers, classrooms, students, avgScore, documents, openLessons, protocols, pendingCount };
  }

  async getSchoolAnalytics() {
    const classrooms = await this.classroomRepo.find({
      relations: { students: { submissions: true }, teacher: true },
      order: { grade: "ASC", name: "ASC" },
    });

    return classrooms.map((cls) => {
      const allSubs = cls.students.flatMap((s) => s.submissions);
      const avg = allSubs.length
        ? Math.round(allSubs.reduce((s, sub) => s + Number(sub.score) / Number(sub.maxScore), 0) / allSubs.length * 100)
        : 0;
      return {
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        subject: cls.subject,
        teacher: cls.teacher?.fullName ?? "—",
        studentCount: cls.students.length,
        avgScore: avg,
      };
    });
  }

  async getTeachersWithStats() {
    const teachers = await this.teacherRepo.find({
      where: { role: "teacher" },
      relations: { classrooms: { students: { submissions: true } }, generatedDocuments: true },
      order: { fullName: "ASC" },
    });

    return teachers.map((t) => {
      const allSubs = t.classrooms.flatMap((c) => c.students.flatMap((s) => s.submissions));
      const avg = allSubs.length
        ? Math.round(allSubs.reduce((s, sub) => s + Number(sub.score) / Number(sub.maxScore), 0) / allSubs.length * 100)
        : 0;
      return {
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        subject: t.subject,
        experience: t.experience,
        category: t.category,
        classCount: t.classrooms.length,
        studentCount: t.classrooms.reduce((s, c) => s + c.students.length, 0),
        avgScore: avg,
        docCount: t.generatedDocuments.length,
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
      preferredLanguage: t.preferredLanguage,
      createdAt: t.createdAt,
    };
  }

  async getRegistrations() {
    const rows = await this.teacherRepo.find({ order: { createdAt: "DESC" } });
    return rows.map((t) => this.serializeTeacher(t));
  }

  async approveRegistration(id: string) {
    await this.teacherRepo.update(id, { status: "active" });
    const t = await this.teacherRepo.findOne({ where: { id } });
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
}
