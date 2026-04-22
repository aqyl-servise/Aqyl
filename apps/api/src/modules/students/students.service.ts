import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "../schools/entities/student.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

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
  ) {}

  findAll(classroomId?: string) {
    return this.studentRepo.find({
      where: classroomId ? { classroom: { id: classroomId } } : {},
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

  getClassrooms() {
    return this.classroomRepo.find({
      relations: ["classTeacher"],
      order: { grade: "ASC", name: "ASC" },
    });
  }

  getClassTeachers() {
    return this.teacherRepo.find({
      where: { role: "class_teacher" },
      order: { fullName: "ASC" },
    });
  }

  async create(dto: CreateStudentDto) {
    if (dto.iin) {
      const existing = await this.studentRepo.findOne({ where: { iin: dto.iin } });
      if (existing) throw new ConflictException("IIN already registered");
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
    return this.studentRepo.save(student);
  }

  async update(id: string, dto: Partial<CreateStudentDto>) {
    if (dto.iin) {
      const existing = await this.studentRepo.findOne({ where: { iin: dto.iin } });
      if (existing && existing.id !== id) throw new ConflictException("IIN already registered");
    }
    await this.studentRepo.update(id, {
      ...(dto.fullName ? { fullName: dto.fullName } : {}),
      ...(dto.iin !== undefined ? { iin: dto.iin || undefined } : {}),
      ...(dto.dateOfBirth !== undefined ? { dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined } : {}),
      ...(dto.parentName !== undefined ? { parentName: dto.parentName } : {}),
      ...(dto.parentContact !== undefined ? { parentContact: dto.parentContact } : {}),
      ...(dto.classroomId ? { classroom: { id: dto.classroomId } } : {}),
      ...(dto.classTeacherId !== undefined ? { classTeacher: dto.classTeacherId ? { id: dto.classTeacherId } : undefined } : {}),
    });
    return this.studentRepo.findOne({ where: { id }, relations: ["classroom", "classTeacher"] });
  }

  async remove(id: string) {
    await this.studentRepo.delete(id);
    return { ok: true };
  }
}
