import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { BillingService } from "../billing/billing.service";
import { AccountSignalsService } from "../trial-guard/account-signals.service";
import { AdminService } from "./admin.service";
import { SkipSchoolIsolation } from "../../common/decorators/skip-school-isolation.decorator";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "vice_principal_academic", "vice_principal_education", "psychologist", "social_pedagogue")
@SkipSchoolIsolation()
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly billingService: BillingService,
    private readonly signalsService: AccountSignalsService,
  ) {}

  @Get("overview")
  getOverview(@Req() req: ReqUser) {
    return this.service.getOverview(req.user.schoolId);
  }

  @Get("analytics")
  getAnalytics(@Req() req: ReqUser) {
    return this.service.getSchoolAnalytics(req.user.schoolId);
  }

  @Get("teachers")
  getTeachers(@Req() req: ReqUser) {
    return this.service.getTeachersWithStats(req.user.schoolId);
  }

  @Get("registrations")
  @Roles("admin", "principal")
  getRegistrations(@Req() req: ReqUser) {
    return this.service.getRegistrations(req.user.schoolId);
  }

  @Patch("registrations/:id/approve")
  @Roles("admin", "principal")
  approveRegistration(@Param("id") id: string, @Body() body?: { schoolId?: string }) {
    return this.service.approveRegistration(id, body?.schoolId);
  }

  @Patch("registrations/:id/reject")
  @Roles("admin", "principal")
  rejectRegistration(@Param("id") id: string) {
    return this.service.rejectRegistration(id);
  }

  @Patch("users/:id/deactivate")
  @Roles("admin", "principal")
  deactivateUser(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.deactivateUser(id, req.user.id);
  }

  @Patch("users/:id/activate")
  @Roles("admin", "principal")
  activateUser(@Param("id") id: string) {
    return this.service.activateUser(id);
  }

  @Delete("users/:id")
  @Roles("admin")
  deleteUser(@Param("id") id: string, @Body() body: { confirm: boolean }, @Req() req: ReqUser) {
    return this.service.deleteUser(id, req.user.id, body?.confirm === true);
  }

  @Patch("users/:id/password")
  @Roles("admin")
  changeUserPassword(@Param("id") id: string, @Body() body: { newPassword: string }, @Req() req: ReqUser) {
    return this.service.changeUserPassword(id, req.user.id, body?.newPassword ?? "");
  }

  @Patch("users/:id/funnel")
  @Roles("admin")
  changeFunnel(
    @Param("id") id: string,
    @Body() body: { target: "b2c" | "b2g"; schoolId?: string | null },
    @Req() req: ReqUser,
  ) {
    return this.service.changeFunnel(id, req.user.id, body?.target, body?.schoolId ?? null);
  }

  @Post("users/:id/subscription")
  @Roles("admin")
  grantSubscription(@Param("id") id: string, @Body() body: { months: number }, @Req() req: ReqUser) {
    return this.service.grantSubscription(id, req.user.id, Number(body?.months));
  }

  @Delete("users/:id/subscription")
  @Roles("admin")
  revokeSubscription(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.revokeSubscription(id, req.user.id);
  }

  /** Начисление уроков (пакеты, ТЗ №3): промо и оплаты мимо Kaspi. */
  @Post("users/:id/lessons")
  @Roles("admin")
  grantLessons(@Param("id") id: string, @Body() body: { lessons: number }, @Req() req: ReqUser) {
    return this.service.grantLessons(id, req.user.id, Number(body?.lessons));
  }

  // ── Ручная оплата по ссылке Kaspi ───────────────────────────────────────
  // API-интеграции у нас нет (порог оборота 30 млн ₸/мес), поэтому вебхук не
  // приходит: учитель платит по ссылке, администратор сверяет поступление в
  // Kaspi и подтверждает здесь — уроки начисляются той же механикой, что и
  // при автоматической оплате.

  /**
   * Кластеры связанных аккаунтов (один адрес или устройство). Это повод
   * посмотреть, а не приговор: в школе весь коллектив выходит с одного
   * адреса. Блокировка — существующей кнопкой деактивации, решение за
   * администратором.
   */
  @Get("signals/clusters")
  @Roles("admin")
  signalClusters() {
    return this.signalsService.clusters();
  }

  /** Заявки, ожидающие подтверждения оплаты. */
  @Get("payments/pending")
  @Roles("admin")
  pendingPayments() {
    return this.billingService.pendingPayments();
  }

  /** Деньги поступили: начислить пакет. */
  @Post("payments/:id/confirm")
  @Roles("admin")
  confirmPayment(@Param("id") id: string, @Req() req: ReqUser) {
    return this.billingService.confirmPayment(id, req.user.id);
  }

  /** Оплата не поступила: закрыть заявку без начисления. */
  @Post("payments/:id/reject")
  @Roles("admin")
  rejectPayment(@Param("id") id: string, @Req() req: ReqUser) {
    return this.billingService.rejectPayment(id, req.user.id);
  }

  /**
   * Воронка B2C: список и сводка. Только `admin` — это платформенная воронка,
   * школьного разреза у неё нет, директору и завучу показывать нечего.
   */
  @Get("b2c")
  @Roles("admin")
  getB2cFunnel() {
    return this.service.getB2cFunnel();
  }

  @Get("security-audit")
  @Roles("admin")
  getSecurityAuditLog(
    @Query("limit") limit = 50,
    @Query("eventType") eventType?: string,
  ) {
    return this.service.getSecurityAuditLog(+limit, eventType);
  }
}
