import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { StudentPortalService } from "./student-portal.service";

interface ReqUser { user: { id: string; role: string } }

@Controller("student")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("student")
export class StudentPortalController {
  constructor(private readonly service: StudentPortalService) {}

  @Get("me")
  getMe(@Req() req: ReqUser) {
    return this.service.getMyProfile(req.user.id);
  }

  @Get("schedule")
  getSchedule(@Req() req: ReqUser) {
    return this.service.getSchedule(req.user.id);
  }

  @Get("assignments")
  getAssignments(@Req() req: ReqUser) {
    return this.service.getAssignments(req.user.id);
  }

  @Post("assignments/:id/submit")
  submitAssignment(
    @Req() req: ReqUser,
    @Param("id") id: string,
    @Body() body: { content?: string; fileUrl?: string },
  ) {
    return this.service.submitAssignment(req.user.id, id, body.content, body.fileUrl);
  }

  @Get("grades")
  getGrades(@Req() req: ReqUser) {
    return this.service.getGrades(req.user.id);
  }
}
