import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { School } from "./entities/school.entity";

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly repo: Repository<School>,
  ) {}

  findAll() {
    return this.repo.find({ order: { name: "ASC" } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string) {
    return this.repo.findOne({ where: { name } });
  }

  async findOrCreate(name: string): Promise<School> {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return this.repo.save(this.repo.create({ name }));
  }

  create(name: string) {
    return this.repo.save(this.repo.create({ name }));
  }
}
