import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TeachersService } from "./teachers.service";
import { ALL_TEACHER_ROLES } from "../../common/roles.constants";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("teachers")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_TEACHER_ROLES)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  getColleagues(@Req() req: ReqUser) {
    if (!req.user.schoolId) return [];
    return this.teachersService.findBySchool(req.user.schoolId);
  }
}
