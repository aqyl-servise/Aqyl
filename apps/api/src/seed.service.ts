import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { Repository } from "typeorm";
import { Teacher } from "./modules/teachers/entities/teacher.entity";

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async seed() {
    const existing = await this.teacherRepo.findOne({ where: { email: "admin@aqyl.kz" } });
    if (existing) return;

    const passwordHash = await bcrypt.hash("admin123", 10);
    await this.teacherRepo.save(
      this.teacherRepo.create({
        fullName: "Администратор",
        email: "admin@aqyl.kz",
        passwordHash,
        role: "admin",
        preferredLanguage: "ru",
      }),
    );
    console.log("Admin account created: admin@aqyl.kz / admin123");
  }

  // No gifted seed data in any environment
  async seedGifted() {}
}
