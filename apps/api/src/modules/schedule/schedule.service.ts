import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Schedule } from "../schools/entities/schedule.entity";
import { Classroom } from "../schools/entities/classroom.entity";

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Classroom)
    private readonly classroomRepo: Repository<Classroom>,
  ) {}

  async getForTeacher(teacherId: string) {
    return this.scheduleRepo.find({
      where: { teacher: { id: teacherId } },
      relations: { classroom: true },
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
  }

  async getForClassroom(classroomId: string) {
    return this.scheduleRepo.find({
      where: { classroom: { id: classroomId } },
      relations: { teacher: true },
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
  }

  async getAll() {
    return this.scheduleRepo.find({
      relations: { classroom: true, teacher: true },
      order: { dayOfWeek: "ASC", period: "ASC" },
    });
  }

  async upsert(data: Partial<Schedule>) {
    return this.scheduleRepo.save(this.scheduleRepo.create(data));
  }

  async remove(id: string) {
    await this.scheduleRepo.delete(id);
  }
}
