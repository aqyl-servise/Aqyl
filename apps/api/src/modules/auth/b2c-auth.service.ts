import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Teacher } from "../teachers/entities/teacher.entity";
import { EmailVerification } from "./entities/email-verification.entity";
import { MailService } from "../mail/mail.service";
import { AuthService } from "./auth.service";
import { RegisterB2CDto } from "./dto/register-b2c.dto";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TRIAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable()
export class B2cAuthService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(EmailVerification) private readonly verificationRepo: Repository<EmailVerification>,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async sendVerificationCode(rawEmail: string): Promise<{ success: true }> {
    const email = rawEmail.toLowerCase().trim();
    const existing = await this.teacherRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.verificationRepo.save(
      this.verificationRepo.create({ email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS), isUsed: false }),
    );

    await this.mailService.sendVerificationCode(email, code);
    // Never return the code in the response.
    return { success: true };
  }

  async verifyCode(rawEmail: string, code: string): Promise<{ verified: true }> {
    const email = rawEmail.toLowerCase().trim();
    const record = await this.latestVerification(email);
    if (!record || record.isUsed || record.expiresAt < new Date() || record.code !== code) {
      throw new BadRequestException("INVALID_CODE");
    }
    record.isUsed = true;
    await this.verificationRepo.save(record);
    return { verified: true };
  }

  async registerB2C(dto: RegisterB2CDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.teacherRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    // Require a recently verified code (verifyCode marks the latest record isUsed=true).
    const record = await this.latestVerification(email);
    if (!record || !record.isUsed) throw new BadRequestException("EMAIL_NOT_VERIFIED");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const teacher = await this.teacherRepo.save(
      this.teacherRepo.create({
        fullName: `${dto.firstName.trim()} ${dto.lastName.trim()}`.trim(),
        email,
        passwordHash,
        role: "teacher",
        status: "active",
        schoolId: undefined, // B2C teacher belongs to no school
        subject: dto.subject?.trim() || undefined,
        isEmailVerified: true,
        registrationSource: "b2c",
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + TRIAL_MS),
      }),
    );

    const tokens = await this.authService.generateTokens(teacher.id, "teacher", "teacher");
    return { ...tokens, user: this.serialize(teacher) };
  }

  async loginB2C(rawEmail: string, password: string) {
    const email = rawEmail.toLowerCase().trim();
    const teacher = await this.teacherRepo.findOne({ where: { email, registrationSource: "b2c" } });
    if (!teacher) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");
    if (teacher.status === "inactive") throw new UnauthorizedException("INACTIVE");

    const tokens = await this.authService.generateTokens(teacher.id, "teacher", "teacher");
    return { ...tokens, user: this.serialize(teacher) };
  }

  async getProfile(userId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { id: userId } });
    if (!teacher) throw new NotFoundException("User not found");
    return this.serialize(teacher);
  }

  private latestVerification(email: string) {
    return this.verificationRepo.findOne({ where: { email }, order: { createdAt: "DESC" } });
  }

  private serialize(teacher: Teacher) {
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      role: teacher.role,
      subject: teacher.subject ?? null,
      preferredLanguage: teacher.preferredLanguage,
      schoolId: teacher.schoolId ?? null,
      registrationSource: teacher.registrationSource,
      isEmailVerified: teacher.isEmailVerified,
      subscriptionStatus: teacher.subscriptionStatus,
      trialEndsAt: teacher.trialEndsAt ?? null,
    };
  }
}
