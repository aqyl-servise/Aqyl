import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Teacher } from "../teachers/entities/teacher.entity";
import { EmailVerification } from "./entities/email-verification.entity";
import { MailService } from "../mail/mail.service";
import { AuthService } from "./auth.service";
import { RegisterB2CDto } from "./dto/register-b2c.dto";
import { TrialGuardService } from "../trial-guard/trial-guard.service";
import { AccountSignalsService } from "../trial-guard/account-signals.service";
import { AccountDeletionService } from "./account-deletion.service";
import { ConsentService } from "../consent/consent.service";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const TRIAL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

@Injectable()
export class B2cAuthService {
  constructor(
    @InjectRepository(Teacher) private readonly teacherRepo: Repository<Teacher>,
    @InjectRepository(EmailVerification) private readonly verificationRepo: Repository<EmailVerification>,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly trialGuard: TrialGuardService,
    private readonly signals: AccountSignalsService,
    private readonly accountDeletion: AccountDeletionService,
    private readonly consentService: ConsentService,
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

  async registerB2C(
    dto: RegisterB2CDto,
    ctx: { ipAddress?: string | null; userAgent?: string | null; device?: string | null } = {},
  ) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.teacherRepo.findOne({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    // Require a recently verified code (verifyCode marks the latest record isUsed=true).
    const record = await this.latestVerification(email);
    if (!record || !record.isUsed) throw new BadRequestException("EMAIL_NOT_VERIFIED");

    // Пробный период выдаётся, только если по этой почте его ещё не выдавали.
    // Отпечаток переживает удаление аккаунта — см. TrialGuardService.
    // Телефон при B2C-регистрации не собирается; когда появится подтверждение
    // номера по SMS, его отпечаток добавится вторым аргументом.
    const grantTrial = await this.trialGuard.shouldGrantTrial(email);

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
        subscriptionStatus: grantTrial ? "trial" : "expired",
        trialEndsAt: grantTrial ? new Date(Date.now() + TRIAL_MS) : null,
      }),
    );

    // Два раздельных согласия фиксируются двумя записями: кто, на что, по
    // какой редакции текста, когда, откуда и каким способом. Сбой записи не
    // роняет регистрацию — пользователь уже создан.
    await this.consentService.recordRegistration(teacher.id, ctx);

    // Мягкие признаки связи аккаунтов — только для показа администратору,
    // блокировок по ним нет (см. AccountSignalsService).
    void this.signals.record(teacher.id, { ip: ctx.ipAddress, device: ctx.device });

    const tokens = await this.authService.generateTokens(teacher.id, "teacher", "teacher");
    return { ...tokens, user: this.serialize(teacher) };
  }

  async loginB2C(
    rawEmail: string,
    password: string,
    ctx: { ipAddress?: string | null; device?: string | null } = {},
  ) {
    const email = rawEmail.toLowerCase().trim();
    const teacher = await this.teacherRepo.findOne({ where: { email, registrationSource: "b2c" } });
    if (!teacher) throw new UnauthorizedException("Invalid credentials");

    const matches = await bcrypt.compare(password, teacher.passwordHash);
    if (!matches) throw new UnauthorizedException("Invalid credentials");

    // Признаки пишем после успешной проверки пароля: иначе перебором чужой
    // почты можно было бы засорять кластеры чужого аккаунта.
    void this.signals.record(teacher.id, { ip: ctx.ipAddress, device: ctx.device });

    // Аккаунт помечен на удаление, но срок восстановления ещё не истёк —
    // вход с прежними данными возвращает его целиком. Пробный период при
    // этом заново не выдаётся (trialEndsAt не трогаем).
    const restored = await this.accountDeletion.restoreIfPending(teacher);
    if (restored) {
      teacher.status = "active";
      teacher.deletionRequestedAt = null;
      teacher.purgeAfter = null;
    }

    if (teacher.status === "inactive") throw new UnauthorizedException("INACTIVE");

    const tokens = await this.authService.generateTokens(teacher.id, "teacher", "teacher");
    return { ...tokens, user: this.serialize(teacher) };
  }

  async getProfile(userId: string) {
    const teacher = await this.teacherRepo.findOne({ where: { id: userId } });
    if (!teacher) throw new NotFoundException("User not found");
    return this.serialize(teacher);
  }

  /** Update B2C onboarding/profile fields. Only whitelisted fields are persisted. */
  async updateProfile(
    userId: string,
    data: Partial<{
      subject: string;
      gradeLevel: string;
      region: string;
      language: string;
      onboardingCompleted: boolean;
    }>,
  ) {
    const teacher = await this.teacherRepo.findOne({ where: { id: userId } });
    if (!teacher) throw new NotFoundException("User not found");

    if (data.subject !== undefined) teacher.subject = data.subject?.trim() || undefined;
    if (data.gradeLevel !== undefined) teacher.gradeLevel = data.gradeLevel?.trim() || undefined;
    if (data.region !== undefined) teacher.region = data.region?.trim() || undefined;
    if (data.language !== undefined) teacher.language = data.language?.trim() || undefined;
    if (data.onboardingCompleted !== undefined) teacher.onboardingCompleted = data.onboardingCompleted;

    await this.teacherRepo.save(teacher);
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
      onboardingCompleted: teacher.onboardingCompleted ?? false,
      gradeLevel: teacher.gradeLevel ?? null,
      region: teacher.region ?? null,
      language: teacher.language ?? null,
    };
  }
}
