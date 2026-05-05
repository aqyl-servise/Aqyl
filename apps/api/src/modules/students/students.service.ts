import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { StudentTransfer } from "../schools/entities/student-transfer.entity";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";

export interface CreateStudentDto {
  fullName: string;
  iin?: string;
  dateOfBirth?: string;
  classroomId: string;
  classTeacherId?: string;
  parentName?: string;
  parentContact?: string;
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Classroom) private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(StudentTransfer) private readonly transferRepo: Repository<StudentTransfer>,
    @InjectRepository(FinalAttestationStudent) private readonly attestationRepo: Repository<FinalAttestationStudent>,
  ) {}

  private async maybeCreateAttestation(fullName: string, grade: number, iin?: string, parentName?: string, schoolId?: string) {
    if (grade !== 9 && grade !== 11) return;
    if (iin) {
      const exists = await this.attestationRepo.findOne({ where: { iin, grade } });
      if (exists) return;
    }
    await this.attestationRepo.save(
      this.attestationRepo.create({ grade, fullName, iin: iin || undefined, parentName: parentName || undefined, schoolId: schoolId || undefined }),
    );
  }

  findAll(classroomId?: string, schoolId?: string | null) {
    const where: Record<string, unknown> = {};
    if (classroomId) {
      where["classroom"] = { id: classroomId };
    } else if (schoolId) {
      where["classroom"] = { schoolId };
    }
    return this.studentRepo.find({
      where,
      relations: ["classroom", "classTeacher"],
      order: { fullName: "ASC" },
    });
  }

  findByTeacher(teacherId: string, classroomId?: string) {
    return this.studentRepo.find({
      where: {
        ...(classroomId ? { classroom: { id: classroomId } } : { classroom: { teacher: { id: teacherId } } }),
      },
      relations: ["classroom", "classTeacher"],
      order: { fullName: "ASC" },
    });
  }

  getClassrooms(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    return this.classroomRepo.find({
      where,
      relations: ["classTeacher"],
      order: { grade: "ASC", name: "ASC" },
    });
  }

  getTeacherClassrooms(teacherId: string) {
    return this.classroomRepo.find({
      where: { teacher: { id: teacherId } },
      relations: ["classTeacher"],
      order: { grade: "ASC", name: "ASC" },
    });
  }

  getClassTeachers(schoolId?: string | null) {
    const where = schoolId
      ? { role: "class_teacher" as const, schoolId }
      : { role: "class_teacher" as const };
    return this.teacherRepo.find({ where, order: { fullName: "ASC" } });
  }

  async create(dto: CreateStudentDto) {
    if (dto.iin) {
      const existing = await this.studentRepo.findOne({ where: { iin: dto.iin } });
      if (existing) throw new ConflictException("IIN_EXISTS");
    }
    const student = this.studentRepo.create({
      fullName: dto.fullName,
      iin: dto.iin || undefined,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      parentName: dto.parentName,
      parentContact: dto.parentContact,
      classroom: { id: dto.classroomId },
      classTeacher: dto.classTeacherId ? { id: dto.classTeacherId } : undefined,
    });
    const saved = await this.studentRepo.save(student);

    const classroom = await this.classroomRepo.findOne({ where: { id: dto.classroomId } });
    if (classroom) {
      await this.maybeCreateAttestation(dto.fullName, classroom.grade, dto.iin, dto.parentName, classroom.schoolId ?? undefined);
    }

    return saved;
  }

  async update(id: string, dto: Partial<CreateStudentDto & { userId?: string | null }>) {
    if (dto.iin) {
      const existing = await this.studentRepo.findOne({ where: { iin: dto.iin } });
      if (existing && existing.id !== id) throw new ConflictException("IIN_EXISTS");
    }
    await this.studentRepo.update(id, {
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.iin !== undefined ? { iin: dto.iin || undefined } : {}),
      ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined } : {}),
      ...(dto.parentName !== undefined ? { parentName: dto.parentName } : {}),
      ...(dto.parentContact !== undefined ? { parentContact: dto.parentContact } : {}),
      ...(dto.classroomId ? { classroom: { id: dto.classroomId } } : {}),
      ...(dto.classTeacherId !== undefined ? { classTeacher: dto.classTeacherId ? { id: dto.classTeacherId } : undefined } : {}),
      ...("userId" in dto ? { userId: dto.userId ?? undefined } : {}),
    });
    return this.studentRepo.findOne({ where: { id }, relations: ["classroom", "classTeacher"] });
  }

  async remove(id: string) {
    await this.studentRepo.delete(id);
    return { ok: true };
  }

  async transfer(studentId: string, classroomId: string, note?: string) {
    const student = await this.studentRepo.findOne({
      where: { id: studentId },
      relations: ["classroom"],
    });
    if (!student) throw new NotFoundException("Student not found");

    await this.transferRepo.save(
      this.transferRepo.create({
        student: { id: studentId },
        fromClassroom: student.classroom ? { id: student.classroom.id } : null,
        toClassroom: { id: classroomId },
        note: note || undefined,
      }),
    );

    await this.studentRepo.update(studentId, { classroom: { id: classroomId } });

    const toClassroom = await this.classroomRepo.findOne({ where: { id: classroomId } });
    if (toClassroom) {
      await this.maybeCreateAttestation(student.fullName, toClassroom.grade, student.iin, student.parentName, toClassroom.schoolId ?? undefined);
    }

    return this.studentRepo.findOne({ where: { id: studentId }, relations: ["classroom", "classTeacher"] });
  }

  getTransferHistory(studentId: string) {
    return this.transferRepo.find({
      where: { student: { id: studentId } },
      relations: ["fromClassroom", "toClassroom"],
      order: { transferredAt: "DESC" },
    });
  }
}
