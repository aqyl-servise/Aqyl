import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { LessThan, Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { Teacher } from "../teachers/entities/teacher.entity";
import { TeachersService } from "../teachers/teachers.service";
import { PasswordReset } from "../schools/entities/password-reset.entity";
import { School } from "../schools/entities/school.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { MailService } from "../mail/mail.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ConfigService } from "@nestjs/config";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectRepository(PasswordReset) private readonly resetRepo: Repository<PasswordReset>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  // ── Token helpers ──────────────────────────────────────────────────────────

  private hashToken(raw: string): string {
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  /** Parse a duration string like "30d", "15m", "12h", "45s" into milliseconds. */
  private durationToMs(value: string, fallbackMs: number): number {
    const m = /^(\d+)\s*([smhd])$/.exec(value.trim());
    if (!m) return fallbackMs;
    const n = parseInt(m[1], 10);
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]] ?? 1;
    return n * unit;
  }

  /** Create + persist a refresh token (hashed). Returns the raw token for the client. */
  async createRefreshToken(userId: string, userType: string): Promise<string> {
    const raw = crypto.randomBytes(40).toString("hex");
    const refreshExpires = this.configService.get<string>("JWT_REFRESH_EXPIRES") ?? "30d";
    const expiresAt = new Date(Date.now() + this.durationToMs(refreshExpires, 30 * 86_400_000));
    await this.refreshRepo.save(
      this.refreshRepo.create({ token: this.hashToken(raw), userId, userType, expiresAt, isRevoked: false }),
    );
    return raw;
  }

  /** Issue a short-lived access token (15m default) + a 30d refresh token. */
  async generateTokens(userId: string, userType: string, role: string): Promise<TokenPair> {
    const accessExpires = (this.configService.get<string>("JWT_ACCESS_EXPIRES") ?? "15m") as JwtSignOptions["expiresIn"];
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, role, userType },
      { expiresIn: accessExpires },
    );
    const refreshToken = await this.createRefreshToken(userId, userType);
    return { accessToken, refreshToken };
  }

  /** Validate a refresh token, rotate it (revoke old, issue new pair). */
  async refreshTokens(rawRefresh: string): Promise<TokenPair> {
    if (!rawRefresh) throw new UnauthorizedException("Invalid refresh token");
    const record = await this.refreshRepo.findOne({ where: { token: this.hashToken(rawRefresh) } });
    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    // Rotate: revoke the used token so it can't be replayed.
    record.isRevoked = true;
    await this.refreshRepo.save(record);

    const teacher = await this.teachersService.findById(record.userId);
    const role = teacher?.role ?? "teacher";
    return this.generateTokens(record.userId, record.userType, role);
  }

  async revokeRefreshToken(rawRefresh: string): Promise<void> {
    if (!rawRefresh) return;
    await this.refreshRepo.update({ token: this.hashToken(rawRefresh) }, { isRevoked: true });
  }

  /** Remove expired refresh tokens. Call from a cron once @nestjs/schedule is added. */
  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshRepo.delete({ expiresAt: LessThan(new Date()) });
  }

  // ── B2G login (unchanged behaviour, now also returns a refresh token) ───────

  async login(loginDto: LoginDto) {
    const teacher = await this.teachersService.findById_withSchool(loginDto.email);
    if (!teacher) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(loginDto.password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");

    return this.issueB2gSession(teacher);
  }

  /**
   * Build a B2G/staff session (rich 1d access token + refresh token) after the
   * caller has already verified the password. Enforces the staff status gates.
   */
  private async issueB2gSession(teacher: Teacher) {
    if (teacher.status === "pending") throw new ForbiddenException("PENDING");
    if (teacher.status === "rejected") throw new ForbiddenException("REJECTED");
    if (teacher.status === "inactive") throw new ForbiddenException("INACTIVE");

    // B2G access token keeps its existing 1d lifetime (the cookie/middleware flow has no
    // refresh wiring), so existing sessions keep working. A refresh token is added on top.
    const b2gAccessExpires = (this.configService.get<string>("JWT_B2G_ACCESS_EXPIRES") ?? "1d") as JwtSignOptions["expiresIn"];
    const accessToken = await this.jwtService.signAsync(
      {
        sub: teacher.id,
        email: teacher.email,
        role: teacher.role,
        schoolId: teacher.schoolId ?? undefined,
        isClassTeacher: teacher.isClassTeacher ?? false,
        managedClassroomId: teacher.managedClassroomId ?? null,
        managedClassroomName: teacher.managedClassroomName ?? null,
      },
      { expiresIn: b2gAccessExpires },
    );
    const refreshToken = await this.createRefreshToken(teacher.id, teacher.role === "admin" ? "admin" : "teacher");

    return {
      accessToken,
      refreshToken,
      user: this.serialize(teacher),
    };
  }

  /**
   * Smart unified login: one email+password entry point for every kind of user.
   * The account's registrationSource decides which session to issue and where the
   * client should land afterwards.
   */
  async universalLogin(email: string, password: string) {
    const teacher = await this.teachersService.findByEmail(email);
    if (!teacher) throw new UnauthorizedException("Неверный email или пароль");

    const matches = await bcrypt.compare(password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Неверный email или пароль");

    // B2C (self-serve individual teacher) → short-lived access + refresh, B2C dashboard.
    if (teacher.registrationSource === "b2c") {
      if (teacher.status === "inactive") throw new UnauthorizedException("INACTIVE");
      const tokens = await this.generateTokens(teacher.id, "teacher", "teacher");
      return { ...tokens, user: this.serialize(teacher), redirectTo: "/dashboard/b2c" };
    }

    // B2G staff (registrationSource 'b2g' or null) and every other role → staff dashboard.
    const session = await this.issueB2gSession(teacher);
    return { ...session, redirectTo: "/dashboard" };
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
    const lang = (teacher.preferredLanguage ?? "ru") as "ru" | "kz" | "en";
    await this.mailService.sendPasswordReset(email, resetUrl, lang, teacher.phone);
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
      isClassTeacher: teacher.isClassTeacher ?? false,
      managedClassroomId: teacher.managedClassroomId ?? null,
      managedClassroomName: teacher.managedClassroomName ?? null,
    };
  }
}
