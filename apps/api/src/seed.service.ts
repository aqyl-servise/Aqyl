import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";
import { Teacher } from "./modules/teachers/entities/teacher.entity";

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
  ) {}

  async seed() {
    const existing = await this.teacherRepo.findOne({ where: { email: "admin@aqyl.kz" } });
    if (existing) return;

    const password = process.env.ADMIN_PASSWORD ?? randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(password, 10);
    await this.teacherRepo.save(
      this.teacherRepo.create({
        fullName: "Администратор",
        email: "admin@aqyl.kz",
        passwordHash,
        role: "admin",
        preferredLanguage: "ru",
      }),
    );
    if (!process.env.ADMIN_PASSWORD) {
      this.logger.warn(`Admin account created. Temporary password: ${password} — change it immediately!`);
    } else {
      this.logger.log("Admin account created: admin@aqyl.kz");
    }
  }

  // No gifted seed data in any environment
  async seedGifted() {}
}
