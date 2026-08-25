import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { B2cAuthService } from "./b2c-auth.service";
import { PhoneVerificationService } from "./phone-verification.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { RefreshTokenDto } from "./dto/refresh.dto";
import { RegisterB2CDto } from "./dto/register-b2c.dto";
import { SendCodeDto, VerifyCodeDto, LoginB2CDto } from "./dto/b2c-auth.dto";
import { UpdateB2CProfileDto } from "./dto/update-b2c-profile.dto";
import { DeleteAccountByPasswordDto, DeleteAccountRequestCodeDto, DeleteAccountConfirmDto } from "./dto/delete-account.dto";
import { AccountDeletionService } from "./account-deletion.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { TeachersService } from "../teachers/teachers.service";
import { SkipIsolation } from "../../guards/skip-isolation.decorator";

interface AuthUser { id: string; fullName: string; email: string; preferredLanguage: string; role: string; subject?: string }

@Controller("auth")
@SkipIsolation()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly b2cAuthService: B2cAuthService,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly accountDeletion: AccountDeletionService,
    private readonly teachersService: TeachersService,
  ) {}

  @Post("login")
  @Throttle({ short: { limit: 5, ttl: 60_000 }, medium: { limit: 20, ttl: 900_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // Smart unified login — one endpoint for B2C, B2G and every other role.
  // Public (no JwtAuthGuard); returns { accessToken, refreshToken, user, redirectTo }.
  @Post("universal-login")
  @Throttle({ short: { limit: 5, ttl: 60_000 }, medium: { limit: 20, ttl: 900_000 } })
  universalLogin(@Body() dto: LoginDto) {
    return this.authService.universalLogin(dto.email, dto.password);
  }

  @Post("register")
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ short: { limit: 3, ttl: 300_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: "If this email is registered, a reset link has been sent." };
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: "Password updated successfully." };
  }

  // ── Refresh tokens ──────────────────────────────────────────────────────────

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revokeRefreshToken(dto.refreshToken);
    return { success: true };
  }

  // ── B2C (individual teacher) registration & login ───────────────────────────

  @Post("b2c/send-code")
  @HttpCode(200)
  // Anti-spam: 3 codes per 10 minutes per client.
  @Throttle({ short: { limit: 3, ttl: 600_000 }, medium: { limit: 3, ttl: 600_000 } })
  sendCode(@Body() dto: SendCodeDto) {
    return this.b2cAuthService.sendVerificationCode(dto.email);
  }

  @Post("b2c/verify-code")
  @HttpCode(200)
  verifyCode(@Body() dto: VerifyCodeDto) {
    return this.b2cAuthService.verifyCode(dto.email, dto.code);
  }

  // ── Подтверждение телефона (защита бесплатного доступа) ────────────────
  // Спрашивается не при регистрации, а при первой генерации: трение попадает
  // туда, где начинается ценность, а не на вход.

  @Post("b2c/phone/send-code")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  // SMS стоят денег: не чаще трёх запросов за десять минут на клиента.
  @Throttle({ short: { limit: 3, ttl: 600_000 }, medium: { limit: 3, ttl: 600_000 } })
  sendPhoneCode(@Body() body: { phone: string }, @Req() req: { user: { id: string } }) {
    return this.phoneVerification.requestCode(req.user.id, body?.phone ?? "");
  }

  @Post("b2c/phone/verify")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @Throttle({ short: { limit: 10, ttl: 600_000 }, medium: { limit: 10, ttl: 600_000 } })
  verifyPhone(@Body() body: { code: string }, @Req() req: { user: { id: string } }) {
    return this.phoneVerification.verifyCode(req.user.id, body?.code ?? "");
  }

  @Post("b2c/register")
  registerB2C(
    @Body() dto: RegisterB2CDto,
    @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> },
  ) {
    // Адрес отправителя и клиент нужны журналу согласий: закон требует, чтобы
    // факт согласия можно было доказать, а не только хранить флаг.
    // За обратным прокси реальный адрес приходит в X-Forwarded-For.
    const forwarded = req.headers["x-forwarded-for"];
    const ipAddress =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.ip || null;
    const ua = req.headers["user-agent"];
    return this.b2cAuthService.registerB2C(dto, {
      ipAddress,
      userAgent: (Array.isArray(ua) ? ua[0] : ua) ?? null,
    });
  }

  @Post("b2c/login")
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  loginB2C(@Body() dto: LoginB2CDto) {
    return this.b2cAuthService.loginB2C(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get("b2c/me")
  meB2C(@Req() req: { user: AuthUser }) {
    return this.b2cAuthService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("b2c/profile")
  updateB2CProfile(@Req() req: { user: AuthUser }, @Body() dto: UpdateB2CProfileDto) {
    return this.b2cAuthService.updateProfile(req.user.id, dto);
  }

  // ── Удаление аккаунта (три точки входа) ───────────────────────────────────
  // Точка 1: из профиля, подтверждение паролем.
  @UseGuards(JwtAuthGuard)
  @Post("b2c/delete-account")
  deleteAccount(@Req() req: { user: AuthUser }, @Body() dto: DeleteAccountByPasswordDto) {
    return this.accountDeletion.deleteByPassword(req.user.id, dto.password);
  }

  // Точка 2: публичная страница — без входа и без пароля, подтверждение кодом.
  // Ответ на запрос кода одинаков независимо от существования аккаунта, иначе
  // форма превращается в проверку, зарегистрирована ли почта.
  @Post("b2c/delete-account/request-code")
  @Throttle({ short: { limit: 3, ttl: 60_000 } })
  requestDeletionCode(@Body() dto: DeleteAccountRequestCodeDto) {
    return this.accountDeletion.requestCode(dto.email);
  }

  @Post("b2c/delete-account/confirm")
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  confirmDeletion(@Body() dto: DeleteAccountConfirmDto) {
    return this.accountDeletion.confirmByCode(dto.email, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: AuthUser }) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("profile")
  async updateProfile(
    @Req() req: { user: AuthUser },
    @Body() body: UpdateProfileDto,
  ) {
    return this.teachersService.updateProfile(req.user.id, { ...body } as Record<string, unknown>);
  }
}
