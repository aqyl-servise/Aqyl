import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
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

  @Get("registrations")
  @Roles("admin")
  getRegistrations() {
    return this.service.getRegistrations();
  }

  @Patch("registrations/:id/approve")
  @Roles("admin")
  approveRegistration(@Param("id") id: string) {
    return this.service.approveRegistration(id);
  }

  @Patch("registrations/:id/reject")
  @Roles("admin")
  rejectRegistration(@Param("id") id: string) {
    return this.service.rejectRegistration(id);
  }

  @Patch("users/:id/deactivate")
  @Roles("admin")
  deactivateUser(@Param("id") id: string, @Req() req: { user: { id: string } }) {
    return this.service.deactivateUser(id, req.user.id);
  }

  @Patch("users/:id/activate")
  @Roles("admin")
  activateUser(@Param("id") id: string) {
    return this.service.activateUser(id);
  }

  @Delete("users/:id")
  @Roles("admin")
  deleteUser(@Param("id") id: string, @Body() body: { confirm: boolean }, @Req() req: { user: { id: string } }) {
    return this.service.deleteUser(id, req.user.id, body?.confirm === true);
  }
}
