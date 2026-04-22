import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpenLesson } from "../schools/entities/open-lesson.entity";

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(OpenLesson)
    private readonly repo: Repository<OpenLesson>,
  ) {}

  getForTeacher(teacherId: string) {
    return this.repo.find({
      where: { teacher: { id: teacherId } },
      order: { date: "DESC" },
    });
  }

  getAll() {
    return this.repo.find({
      relations: { teacher: true },
      order: { date: "DESC" },
    });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: { teacher: true } });
  }

  create(data: Partial<OpenLesson>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>) {
    await this.repo.update(id, data as never);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}
