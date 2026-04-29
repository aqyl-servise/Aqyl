import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AdminService } from "./admin.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class AdminController {
  constructor(private readonly service: AdminService) {}

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
  approveRegistration(@Param("id") id: string) {
    return this.service.approveRegistration(id);
  }

  @Patch("registrations/:id/reject")
  @Roles("admin", "principal")
  rejectRegistration(@Param("id") id: string) {
    return this.service.rejectRegistration(id);
  }

  @Patch("users/:id/deactivate")
  @Roles("admin")
  deactivateUser(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.deactivateUser(id, req.user.id);
  }

  @Patch("users/:id/activate")
  @Roles("admin")
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
}
