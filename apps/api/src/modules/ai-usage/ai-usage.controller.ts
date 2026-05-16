import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AiUsageService } from "./ai-usage.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("ai-usage")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiUsageController {
  constructor(private readonly svc: AiUsageService) {}

  @Get("my")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  getMyUsage(@Req() req: ReqUser) {
    return this.svc.getTodayUsage(req.user.id);
  }

  @Get("summary")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getSummary(
    @Req() req: ReqUser,
    @Query("period") period?: "today" | "week" | "month",
  ) {
    return this.svc.getSchoolSummary(req.user.schoolId ?? "", period ?? "today");
  }

  @Get("by-teacher")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getByTeacher(@Req() req: ReqUser, @Query("date") date?: string) {
    return this.svc.getTeacherBreakdown(req.user.schoolId ?? "", date);
  }

  @Get("chart")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getChart(@Req() req: ReqUser, @Query("days") days?: string) {
    return this.svc.getChartData(req.user.schoolId ?? "", days ? Number(days) : 30);
  }

  @Get("most-active")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getMostActive(@Req() req: ReqUser) {
    return this.svc.getMostActiveToday(req.user.schoolId ?? "");
  }
}
