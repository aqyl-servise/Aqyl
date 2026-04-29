import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { School } from "./entities/school.entity";
import { Teacher } from "../teachers/entities/teacher.entity";

function generateCode(name: string, city?: string): string {
  const source = (city || name).replace(/[^a-zA-ZА-Яа-яЁё]/g, "");
  const prefix = source.slice(0, 3).toUpperCase() || "SCH";
  const suffix = String(Date.now()).slice(-4);
  return `${prefix}-${suffix}`;
}

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private readonly repo: Repository<School>,
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async findAllWithStats() {
    const schools = await this.repo.find({ order: { name: "ASC" } });
    const result = await Promise.all(
      schools.map(async (s) => {
        const userCount = await this.teacherRepo.count({ where: { schoolId: s.id } });
        return {
          id: s.id,
          name: s.name,
          city: s.city ?? null,
          region: s.region ?? null,
          code: s.code,
          isActive: s.isActive,
          userCount,
          createdAt: s.createdAt,
        };
      }),
    );
    return result;
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
    const code = generateCode(name);
    return this.repo.save(this.repo.create({ name, code }));
  }

  async createSchool(data: { name: string; city?: string; region?: string }): Promise<School> {
    const existing = await this.findByName(data.name);
    if (existing) throw new ConflictException("Школа с таким названием уже существует");
    const code = generateCode(data.name, data.city);
    return this.repo.save(this.repo.create({ name: data.name, city: data.city, region: data.region, code }));
  }

  async activate(id: string) {
    const school = await this.repo.findOne({ where: { id } });
    if (!school) throw new NotFoundException("School not found");
    await this.repo.update(id, { isActive: true });
    return { ...school, isActive: true };
  }

  async deactivate(id: string) {
    const school = await this.repo.findOne({ where: { id } });
    if (!school) throw new NotFoundException("School not found");
    await this.repo.update(id, { isActive: false });
    return { ...school, isActive: false };
  }
}
