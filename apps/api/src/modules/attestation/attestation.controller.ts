import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AttestationService } from "./attestation.service";

interface ReqUser { user: { schoolId?: string | null } }

@Controller("attestation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class AttestationController {
  constructor(private readonly service: AttestationService) {}

  @Get()
  findAll(@Req() req: ReqUser) {
    return this.service.findAll(req.user.schoolId);
  }

  @Get(":teacherId")
  findOne(@Param("teacherId") teacherId: string) {
    return this.service.findByTeacher(teacherId);
  }

  @Patch(":teacherId")
  update(@Param("teacherId") teacherId: string, @Body() body: Record<string, unknown>) {
    return this.service.upsert(teacherId, body as never);
  }
}
