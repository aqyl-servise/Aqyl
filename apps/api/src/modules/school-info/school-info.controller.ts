import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SchoolInfoService } from "./school-info.service";
import { SchoolInfo } from "../schools/entities/school-info.entity";

interface ReqUser { user: { schoolId?: string | null } }

@Controller("school/info")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolInfoController {
  constructor(private readonly service: SchoolInfoService) {}

  @Get()
  @Roles("admin", "principal", "vice_principal")
  getInfo(@Req() req: ReqUser) {
    return this.service.getInfo(req.user.schoolId);
  }

  @Patch()
  @Roles("admin", "principal")
  updateInfo(@Req() req: ReqUser, @Body() body: Partial<SchoolInfo>) {
    return this.service.updateInfo(body, req.user.schoolId);
  }
}
