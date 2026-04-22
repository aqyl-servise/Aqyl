import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClassHour } from "../schools/entities/class-hour.entity";

@Injectable()
export class ClassHoursService {
  constructor(
    @InjectRepository(ClassHour)
    private readonly repo: Repository<ClassHour>,
  ) {}

  getForTeacher(teacherId: string) {
    return this.repo.find({
      where: { classTeacher: { id: teacherId } },
      relations: { classroom: true },
      order: { date: "DESC" },
    });
  }

  getAll() {
    return this.repo.find({
      relations: { classTeacher: true, classroom: true },
      order: { date: "DESC" },
    });
  }

  create(data: Partial<ClassHour>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.repo.update(id, data as never);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}
