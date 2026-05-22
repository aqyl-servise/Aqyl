import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { DashboardService } from "./dashboard.service";
import { STAFF_ROLES, ALL_TEACHER_ROLES } from "../../common/roles.constants";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES, ...ALL_TEACHER_ROLES)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getDashboard(@Req() req: { user: { id: string } }) {
    return this.dashboardService.getDashboard(req.user.id);
  }
}
