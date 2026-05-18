import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TeacherNotification, NotificationType } from "./teacher-notification.entity";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(TeacherNotification)
    private readonly repo: Repository<TeacherNotification>,
  ) {}

  async createNotification(data: {
    teacherId: string; schoolId?: string; type: NotificationType;
    title: string; message: string;
  }) {
    return this.repo.save(this.repo.create({ ...data, isRead: false }));
  }

  async getMyNotifications(teacherId: string) {
    return this.repo.find({
      where: { teacherId },
      order: { createdAt: "DESC" },
    });
  }

  async getUnreadCount(teacherId: string) {
    const count = await this.repo.count({ where: { teacherId, isRead: false } });
    return { count };
  }

  async markRead(id: string, teacherId: string) {
    await this.repo.update({ id, teacherId }, { isRead: true });
    return { ok: true };
  }

  async markAllRead(teacherId: string) {
    await this.repo.update({ teacherId, isRead: false }, { isRead: true });
    return { ok: true };
  }
}
