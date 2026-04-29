import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClassHour } from "../schools/entities/class-hour.entity";
import { ClassHourHistory } from "../schools/entities/class-hour-history.entity";

@Injectable()
export class ClassHoursService {
  constructor(
    @InjectRepository(ClassHour)
    private readonly repo: Repository<ClassHour>,
    @InjectRepository(ClassHourHistory)
    private readonly historyRepo: Repository<ClassHourHistory>,
  ) {}

  getForTeacher(teacherId: string) {
    return this.repo.find({
      where: { classTeacher: { id: teacherId } },
      relations: { classroom: true },
      order: { date: "DESC" },
    });
  }

  getAll(schoolId?: string | null) {
    const where = schoolId ? { schoolId } : {};
    return this.repo.find({
      where,
      relations: { classTeacher: true, classroom: true },
      order: { date: "DESC" },
    });
  }

  getSchedule(teacherId: string | null, schoolId: string | null | undefined, isAdmin: boolean) {
    if (isAdmin) {
      const where = schoolId ? { schoolId } : {};
      return this.repo.find({
        where,
        relations: { classTeacher: true, classroom: true },
        order: { time: "ASC" },
      });
    }
    return this.repo.find({
      where: { classTeacher: { id: teacherId! } },
      relations: { classroom: true },
      order: { time: "ASC" },
    });
  }

  create(data: Partial<ClassHour>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Record<string, unknown>, changedById?: string, changeDescription?: string) {
    await this.repo.update(id, data as never);
    if (changedById) {
      await this.historyRepo.save(
        this.historyRepo.create({
          classHourId: id,
          changedById,
          changeDescription: changeDescription ?? "Updated",
          changedBy: { id: changedById } as never,
        }),
      );
    }
    return this.repo.findOne({ where: { id }, relations: { classTeacher: true, classroom: true } });
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }

  getHistory(classHourId: string) {
    return this.historyRepo.find({
      where: { classHourId },
      relations: { changedBy: true },
      order: { createdAt: "DESC" },
    });
  }
}
