import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { FinalAttestationService, FinalStudentDto } from "./final-attestation.service";

@Controller("final-attestation")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class FinalAttestationController {
  constructor(private readonly service: FinalAttestationService) {}

  @Get("students")
  findAll(@Query("grade") grade: string) {
    return this.service.findAll(Number(grade));
  }

  @Post("students")
  create(@Body() dto: FinalStudentDto) {
    return this.service.create(dto);
  }

  @Patch("students/:id")
  update(@Param("id") id: string, @Body() dto: Partial<FinalStudentDto>) {
    return this.service.update(id, dto);
  }

  @Delete("students/:id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
