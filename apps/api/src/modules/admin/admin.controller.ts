import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get("overview")
  getOverview() {
    return this.service.getOverview();
  }

  @Get("analytics")
  getAnalytics() {
    return this.service.getSchoolAnalytics();
  }

  @Get("teachers")
  getTeachers() {
    return this.service.getTeachersWithStats();
  }
}
