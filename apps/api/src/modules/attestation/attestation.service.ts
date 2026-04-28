import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeacherAttestation } from "../schools/entities/teacher-attestation.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

@Injectable()
export class AttestationService {
  constructor(
    @InjectRepository(TeacherAttestation)
    private readonly repo: Repository<TeacherAttestation>,
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async findAll() {
    const teachers = await this.teacherRepo.find({
      where: [{ role: "teacher" }, { role: "principal" }, { role: "vice_principal" }, { role: "class_teacher" }],
      order: { fullName: "ASC" },
    });
    const attestations = await this.repo.find({ relations: ["teacher"] });
    const map = new Map(attestations.map((a) => [a.teacher.id, a]));

    return teachers.map((t) => {
      const a = map.get(t.id);
      return {
        teacher: { id: t.id, fullName: t.fullName, subject: t.subject, email: t.email, experience: t.experience },
        attestation: a
          ? {
              id: a.id,
              category: a.category,
              categoryDate: a.categoryDate,
              nextAttestationDate: a.nextAttestationDate,
              ozpResult: a.ozpResult,
            }
          : null,
      };
    });
  }

  async findByTeacher(teacherId: string) {
    return this.repo.findOne({ where: { teacher: { id: teacherId } }, relations: ["teacher"] });
  }

  async upsert(teacherId: string, data: Partial<TeacherAttestation>) {
    let record = await this.repo.findOne({ where: { teacher: { id: teacherId } } });
    if (!record) {
      record = this.repo.create({ teacher: { id: teacherId } as Teacher });
    }
    Object.assign(record, data);
    return this.repo.save(record);
  }
}
