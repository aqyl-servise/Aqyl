import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AttestationService } from "./attestation.service";
import { UpdateAttestationDto } from "./dto/update-attestation.dto";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("attestation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "vice_principal_academic")
export class AttestationController {
  constructor(private readonly service: AttestationService) {}

  @Get("my")
  @Roles("teacher", "class_teacher")
  async getMyAttestation(@Req() req: ReqUser) {
    return (await this.service.findByTeacher(req.user.id)) ?? {};
  }

  @Get()
  findAll(@Req() req: ReqUser) {
    return this.service.findAll(req.user.schoolId);
  }

  @Get(":teacherId")
  findOne(@Param("teacherId") teacherId: string) {
    return this.service.findByTeacher(teacherId);
  }

  @Patch(":teacherId")
  update(@Param("teacherId") teacherId: string, @Body() dto: UpdateAttestationDto) {
    return this.service.upsert(teacherId, dto as never);
  }
}
