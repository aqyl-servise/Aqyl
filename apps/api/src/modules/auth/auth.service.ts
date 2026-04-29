import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Teacher } from "../teachers/entities/teacher.entity";
import { TeachersService } from "../teachers/teachers.service";
import { PasswordReset } from "../schools/entities/password-reset.entity";
import { School } from "../schools/entities/school.entity";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordReset) private readonly resetRepo: Repository<PasswordReset>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
  ) {}

  async login(loginDto: LoginDto) {
    const teacher = await this.teachersService.findById_withSchool(loginDto.email);
    if (!teacher) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(loginDto.password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");

    if (teacher.status === "pending") throw new ForbiddenException("PENDING");
    if (teacher.status === "rejected") throw new ForbiddenException("REJECTED");
    if (teacher.status === "inactive") throw new ForbiddenException("INACTIVE");

    return {
      accessToken: await this.jwtService.signAsync({
        sub: teacher.id,
        email: teacher.email,
        role: teacher.role,
        schoolId: teacher.schoolId ?? undefined,
      }),
      user: this.serialize(teacher),
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.teachersService.findByEmail(dto.email);
    if (existing) throw new ConflictException("Email already registered");

    let schoolId: string | undefined;
    if (dto.schoolName) {
      const school = await this.findOrCreateSchool(dto.schoolName);
      schoolId = school.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.teachersService.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role as Teacher["role"],
      schoolName: dto.schoolName,
      schoolId,
      status: "pending",
    });

    return { message: "Registration submitted. Awaiting admin approval." };
  }

  async forgotPassword(email: string): Promise<void> {
    const teacher = await this.teachersService.findByEmail(email.toLowerCase());
    // Always respond the same way — don't reveal if email exists
    if (!teacher) return;

    // Invalidate any previous token for this email
    await this.resetRepo.delete({ email: email.toLowerCase() });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.resetRepo.save(this.resetRepo.create({ email: email.toLowerCase(), token, expiresAt }));

    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    await this.mailService.sendPasswordReset(email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.resetRepo.findOne({ where: { token } });
    if (!record) throw new BadRequestException("INVALID_TOKEN");
    if (record.expiresAt < new Date()) {
      await this.resetRepo.delete(record.id);
      throw new BadRequestException("TOKEN_EXPIRED");
    }

    const teacher = await this.teachersService.findByEmail(record.email);
    if (!teacher) throw new BadRequestException("INVALID_TOKEN");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.teachersService.updateProfile(teacher.id, { passwordHash } as never);
    await this.resetRepo.delete(record.id);
  }

  private async findOrCreateSchool(name: string): Promise<School> {
    const existing = await this.schoolRepo.findOne({ where: { name } });
    if (existing) return existing;
    const source = name.replace(/[^a-zA-ZА-Яа-яЁё]/g, "");
    const prefix = source.slice(0, 3).toUpperCase() || "SCH";
    const code = `${prefix}-${String(Date.now()).slice(-4)}`;
    return this.schoolRepo.save(this.schoolRepo.create({ name, code }));
  }

  private serialize(teacher: Teacher) {
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      preferredLanguage: teacher.preferredLanguage,
      role: teacher.role,
      subject: teacher.subject,
      schoolId: teacher.schoolId ?? null,
      schoolName: teacher.schoolName ?? null,
    };
  }
}
