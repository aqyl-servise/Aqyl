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

  async getInfo(): Promise<SchoolInfo> {
    const existing = await this.repo.findOne({ where: {} });
    if (existing) return existing;
    return this.repo.save(this.repo.create({}));
  }

  async updateInfo(data: Partial<SchoolInfo>): Promise<SchoolInfo> {
    const existing = await this.repo.findOne({ where: {} });
    if (existing) {
      Object.assign(existing, data);
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create(data));
  }
}
