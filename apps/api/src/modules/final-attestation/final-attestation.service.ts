import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinalAttestationStudent } from "../schools/entities/final-attestation-student.entity";

export interface FinalStudentDto {
  grade: number;
  fullName: string;
  subject?: string;
  iin?: string;
  email?: string;
  phone?: string;
  parentName?: string;
}

@Injectable()
export class FinalAttestationService {
  constructor(
    @InjectRepository(FinalAttestationStudent)
    private readonly repo: Repository<FinalAttestationStudent>,
  ) {}

  findAll(grade: number, schoolId?: string | null) {
    const where: Record<string, unknown> = { grade };
    if (schoolId) where["schoolId"] = schoolId;
    return this.repo.find({ where, order: { fullName: "ASC" } });
  }

  create(dto: FinalStudentDto, schoolId?: string | null) {
    return this.repo.save(this.repo.create({ ...dto, schoolId: schoolId ?? undefined }));
  }

  async update(id: string, dto: Partial<FinalStudentDto>) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException("Student not found");
    Object.assign(record, dto);
    return this.repo.save(record);
  }

  async remove(id: string) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException("Student not found");
    await this.repo.delete(id);
    return { ok: true };
  }
}
