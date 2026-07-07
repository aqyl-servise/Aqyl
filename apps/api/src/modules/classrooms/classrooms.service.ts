import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { Student } from "../schools/entities/student.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { SubjectTeacherAssignment } from "../schools/entities/subject-teacher-assignment.entity";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";

export interface CreateClassroomDto {
  name: string;
  academicYear?: string;
  classTeacherId?: string;
}

function gradeFromName(name: string): number {
  const m = name.match(/^(\d+)/);
  return m ? Math.min(Math.max(parseInt(m[1], 10), 1), 12) : 1;
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return new Date().getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

@Injectable()
export class ClassroomsService {
  constructor(
    @InjectRepository(Classroom) private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(StudentTransfer) private readonly transferRepo: Repository<StudentTransfer>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(SubjectTeacherAssignment) private readonly subjectTeacherRepo: Repository<SubjectTeacherAssignment>,
    @InjectRepository(FinalAttestationStudent) private readonly attestationRepo: Repository<FinalAttestationStudent>,
  ) {}

  getSubjectTeachers(classroomId: string) {
    return this.subjectTeacherRepo.find({
      where: { classroomId },
      relations: ["teacher"],
      order: { subject: "ASC" },
    });
  }

  addSubjectTeacher(classroomId: string, teacherId: string, subject: string) {
    return this.subjectTeacherRepo.save(
      this.subjectTeacherRepo.create({ classroomId, teacherId, subject, teacher: { id: teacherId }, classroom: { id: classroomId } }),
    );
  }

  async removeSubjectTeacher(assignmentId: string) {
    await this.subjectTeacherRepo.delete(assignmentId);
    return { ok: true };
  }

  async findAll(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    const classrooms = await this.classroomRepo.find({
      where,
      relations: ["classTeacher", "students"],
      order: { grade: "ASC", name: "ASC" },
    });
    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      academicYear: c.academicYear,
      classTeacher: c.classTeacher ? { id: c.classTeacher.id, fullName: c.classTeacher.fullName } : null,
      studentCount: c.students.length,
    }));
  }

  async create(dto: CreateClassroomDto, schoolId?: string | null) {
    const classroom = this.classroomRepo.create({
      name: dto.name.trim(),
      grade: gradeFromName(dto.name),
      academicYear: dto.academicYear?.trim() || currentAcademicYear(),
      classTeacher: dto.classTeacherId ? ({ id: dto.classTeacherId } as Teacher) : undefined,
      schoolId: schoolId ?? undefined,
      school: schoolId ? ({ id: schoolId } as never) : undefined,
    });
    const saved = await this.classroomRepo.save(classroom);

    if (dto.classTeacherId) {
      await this.teacherRepo.update(dto.classTeacherId, {
        isClassTeacher: true,
        managedClassroomId: saved.id,
        managedClassroomName: dto.name.trim(),
      });
    }

    return this.classroomRepo.findOne({ where: { id: saved.id }, relations: ["classTeacher"] });
  }

  async update(id: string, dto: Partial<CreateClassroomDto>, schoolId?: string | null) {
    if (schoolId) {
      const owned = await this.classroomRepo.findOne({ where: { id, schoolId } });
      if (!owned) throw new NotFoundException();
    }
    if (dto.classTeacherId !== undefined) {
      const existing = await this.classroomRepo.findOne({ where: { id }, relations: ["classTeacher"] });
      const prevTeacherId = existing?.classTeacher?.id;
      const newTeacherId = dto.classTeacherId || null;

      if (prevTeacherId && prevTeacherId !== newTeacherId) {
        await this.teacherRepo.update(prevTeacherId, {
          isClassTeacher: false,
          managedClassroomId: null as never,
          managedClassroomName: null as never,
        });
      }

      if (newTeacherId) {
        const classroomName = dto.name?.trim() ?? existing?.name ?? "";
        await this.teacherRepo.update(newTeacherId, {
          isClassTeacher: true,
          managedClassroomId: id,
          managedClassroomName: classroomName,
        });
      }
    }

    await this.classroomRepo.update(id, {
      ...(dto.name ? { name: dto.name.trim(), grade: gradeFromName(dto.name) } : {}),
      ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear?.trim() || undefined } : {}),
      ...(dto.classTeacherId !== undefined
        ? { classTeacher: dto.classTeacherId ? { id: dto.classTeacherId } : null }
        : {}),
    } as never);
    return this.classroomRepo.findOne({ where: { id }, relations: ["classTeacher"] });
  }

  async remove(id: string, schoolId?: string | null) {
    const res = await this.classroomRepo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException();
    return { ok: true };
  }

  /** Move every student from one classroom to another and record each transfer. */
  async bulkTransfer(fromId: string, toId: string) {
    const students = await this.studentRepo.find({
      where: { classroom: { id: fromId } },
    });

    const toClassroom = await this.classroomRepo.findOne({ where: { id: toId } });

    if (students.length === 0) return { transferred: 0 };
    const studentIds = students.map((s) => s.id);

    // Optimized: replaced per-student save+update loop (N+1) with bulk operations.
    // 1) One bulk insert of transfer records.
    await this.transferRepo.save(
      students.map((student) =>
        this.transferRepo.create({
          student: { id: student.id },
          fromClassroom: { id: fromId },
          toClassroom: { id: toId },
          note: "Массовый перевод",
        }),
      ),
    );

    // 2) One UPDATE moving every student to the target classroom.
    await this.studentRepo.update({ id: In(studentIds) }, { classroom: { id: toId } });

    // 3) For graduating grades, batch-create attestation rows for students not already present.
    if (toClassroom && (toClassroom.grade === 9 || toClassroom.grade === 11)) {
      const iins = students.map((s) => s.iin).filter((iin): iin is string => !!iin);
      const existing = iins.length
        ? await this.attestationRepo.find({ where: { iin: In(iins), grade: toClassroom.grade } })
        : [];
      const existingIins = new Set(existing.map((e) => e.iin));

      const toCreate = students
        .filter((student) => !student.iin || !existingIins.has(student.iin))
        .map((student) =>
          this.attestationRepo.create({
            grade: toClassroom.grade,
            fullName: student.fullName,
            iin: student.iin || undefined,
            parentName: student.parentName || undefined,
            schoolId: toClassroom.schoolId ?? undefined,
          }),
        );
      if (toCreate.length) await this.attestationRepo.save(toCreate);
    }

    return { transferred: students.length };
  }

  async getFullInfo(classroomId: string) {
    const classroom = await this.classroomRepo.findOne({
      where: { id: classroomId },
      relations: ["classTeacher", "students"],
    });
    if (!classroom) return null;

    const subjectTeachers = await this.subjectTeacherRepo.find({
      where: { classroomId },
      relations: ["teacher"],
      order: { subject: "ASC" },
    });

    const students = (classroom.students ?? []).sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

    return {
      id: classroom.id,
      name: classroom.name,
      grade: classroom.grade,
      academicYear: classroom.academicYear,
      classTeacher: classroom.classTeacher
        ? { id: classroom.classTeacher.id, fullName: classroom.classTeacher.fullName }
        : null,
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        iin: s.iin,
        parentName: s.parentName,
        parentContact: s.parentContact,
      })),
      subjectTeachers: subjectTeachers.map((st) => ({
        id: st.id,
        subject: st.subject,
        teacher: { id: st.teacher.id, fullName: st.teacher.fullName },
      })),
      statistics: { total: students.length },
    };
  }

  getClassTeachers(schoolId?: string | null) {
    if (schoolId) {
      return this.teacherRepo.find({
        where: [
          { role: "class_teacher", schoolId },
          { role: "teacher", schoolId },
        ],
        order: { fullName: "ASC" },
      });
    }
    return this.teacherRepo.find({
      where: [{ role: "class_teacher" }, { role: "teacher" }],
      order: { fullName: "ASC" },
    });
  }
}
