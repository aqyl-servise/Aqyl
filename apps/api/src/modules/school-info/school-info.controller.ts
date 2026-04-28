import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SchoolInfoService } from "./school-info.service";
import { SchoolInfo } from "../schools/entities/school-info.entity";

@Controller("school/info")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchoolInfoController {
  constructor(private readonly service: SchoolInfoService) {}

  @Get()
  @Roles("admin", "principal", "vice_principal")
  getInfo() {
    return this.service.getInfo();
  }

  @Patch()
  @Roles("admin", "principal")
  updateInfo(@Body() body: Partial<SchoolInfo>) {
    return this.service.updateInfo(body);
  }
}
