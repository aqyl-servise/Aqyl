import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Schedule } from "../schools/entities/schedule.entity";
import { Classroom } from "../schools/entities/classroom.entity";
import { ScheduleVersion } from "../schools/entities/schedule-version.entity";

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Classroom)
    private readonly classroomRepo: Repository<Classroom>,
    @InjectRepository(ScheduleVersion)
    private readonly versionRepo: Repository<ScheduleVersion>,
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

  async remove(id: string, schoolId?: string | null) {
    const res = await this.scheduleRepo.delete(schoolId ? { id, schoolId } : { id });
    if (!res.affected) throw new NotFoundException();
  }

  async getAdminSchedule(schoolId: string, classroomId?: string, version = "main", academicYear?: string) {
    const where: Record<string, unknown> = { schoolId, version };
    if (classroomId) where["classroom"] = { id: classroomId };
    if (academicYear) where["academicYear"] = academicYear;
    return this.scheduleRepo.find({ where, relations: ["classroom", "teacher"], order: { dayOfWeek: "ASC", period: "ASC" } });
  }

  async adminUpsert(data: {
    schoolId: string; classroomId: string; teacherId?: string; subject: string;
    dayOfWeek: number; period: number; room?: string; version?: string; academicYear?: string;
  }) {
    const version = data.version ?? "main";
    const academicYear = data.academicYear;

    if (data.teacherId) {
      const conflict = await this.scheduleRepo.findOne({
        where: { teacher: { id: data.teacherId }, dayOfWeek: data.dayOfWeek, period: data.period, version },
        relations: ["classroom"],
      });
      if (conflict && conflict.classroom.id !== data.classroomId) {
        throw new ConflictException(`Невозможно добавить учителя: на это время у него уже есть занятие в классе ${conflict.classroom.name}`);
      }
    }

    const existing = await this.scheduleRepo.findOne({
      where: { classroom: { id: data.classroomId }, dayOfWeek: data.dayOfWeek, period: data.period, version },
    });

    if (existing) {
      await this.scheduleRepo.update(existing.id, {
        subject: data.subject, room: data.room, schoolId: data.schoolId, academicYear,
        teacher: data.teacherId ? { id: data.teacherId } as never : undefined,
      });
      return this.scheduleRepo.findOne({ where: { id: existing.id }, relations: ["classroom", "teacher"] });
    }

    return this.scheduleRepo.save(this.scheduleRepo.create({
      schoolId: data.schoolId,
      subject: data.subject, dayOfWeek: data.dayOfWeek, period: data.period,
      room: data.room, version, academicYear,
      classroom: { id: data.classroomId } as never,
      teacher: data.teacherId ? { id: data.teacherId } as never : undefined,
    }));
  }

  async getVersions(schoolId: string): Promise<string[]> {
    const rows = await this.scheduleRepo
      .createQueryBuilder("s")
      .select("DISTINCT s.version", "version")
      .where("s.schoolId = :schoolId", { schoolId })
      .getRawMany<{ version: string }>();
    return rows.map(r => r.version).filter(Boolean);
  }

  async saveVersion(schoolId: string, name: string, createdBy: string) {
    const entries = await this.getAdminSchedule(schoolId);
    return this.versionRepo.save(
      this.versionRepo.create({ schoolId, name, createdBy, data: entries }),
    );
  }

  async exportCsv(schoolId: string, classroomId?: string, version = "main"): Promise<string> {
    const entries = await this.getAdminSchedule(schoolId, classroomId, version);
    const DAYS = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const BOM = "﻿";
    const header = "Урок,День,Предмет,Учитель,Кабинет,Класс\r\n";
    const rows = entries.map(e => [
      e.period, DAYS[e.dayOfWeek] ?? e.dayOfWeek,
      e.subject, e.teacher?.fullName ?? "",
      e.room ?? "", e.classroom?.name ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    return BOM + header + rows;
  }
}
