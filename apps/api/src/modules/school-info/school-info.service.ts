import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SchoolInfo } from "../schools/entities/school-info.entity";

@Injectable()
export class SchoolInfoService {
  constructor(
    @InjectRepository(SchoolInfo)
    private readonly repo: Repository<SchoolInfo>,
  ) {}

  async getInfo(schoolId?: string | null): Promise<SchoolInfo> {
    const where = schoolId ? { schoolId } : {};
    const existing = await this.repo.findOne({ where });
    if (existing) return existing;
    return this.repo.save(this.repo.create({ schoolId: schoolId ?? undefined }));
  }

  async updateInfo(data: Partial<SchoolInfo>, schoolId?: string | null): Promise<SchoolInfo> {
    const where = schoolId ? { schoolId } : {};
    const existing = await this.repo.findOne({ where });
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({ ...data, schoolId: schoolId ?? undefined }));
  }
}
