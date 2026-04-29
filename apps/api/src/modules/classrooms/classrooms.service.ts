import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Classroom } from "../schools/entities/classroom.entity";
import { Student } from "../schools/entities/student.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

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
  ) {}

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
    return this.classroomRepo.findOne({ where: { id: saved.id }, relations: ["classTeacher"] });
  }

  async update(id: string, dto: Partial<CreateClassroomDto>) {
    await this.classroomRepo.update(id, {
      ...(dto.name ? { name: dto.name.trim(), grade: gradeFromName(dto.name) } : {}),
      ...(dto.academicYear !== undefined ? { academicYear: dto.academicYear?.trim() || undefined } : {}),
      ...(dto.classTeacherId !== undefined
        ? { classTeacher: dto.classTeacherId ? { id: dto.classTeacherId } : null }
        : {}),
    } as never);
    return this.classroomRepo.findOne({ where: { id }, relations: ["classTeacher"] });
  }

  async remove(id: string) {
    await this.classroomRepo.delete(id);
    return { ok: true };
  }

  /** Move every student from one classroom to another and record each transfer. */
  async bulkTransfer(fromId: string, toId: string) {
    const students = await this.studentRepo.find({
      where: { classroom: { id: fromId } },
    });

    for (const student of students) {
      await this.transferRepo.save(
        this.transferRepo.create({
          student: { id: student.id },
          fromClassroom: { id: fromId },
          toClassroom: { id: toId },
          note: "Массовый перевод",
        }),
      );
      await this.studentRepo.update(student.id, { classroom: { id: toId } });
    }

    return { transferred: students.length };
  }

  getClassTeachers(schoolId?: string | null) {
    const where = schoolId
      ? { role: "class_teacher" as const, schoolId }
      : { role: "class_teacher" as const };
    return this.teacherRepo.find({ where, order: { fullName: "ASC" } });
  }
}
