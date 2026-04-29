import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ClassroomsService, CreateClassroomDto } from "./classrooms.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("classrooms")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class ClassroomsController {
  constructor(private readonly service: ClassroomsService) {}

  @Get()
  findAll(@Req() req: ReqUser) {
    return this.service.findAll(req.user.schoolId);
  }

  @Get("class-teachers")
  getClassTeachers(@Req() req: ReqUser) {
    return this.service.getClassTeachers(req.user.schoolId);
  }

  @Post()
  create(@Req() req: ReqUser, @Body() dto: CreateClassroomDto) {
    return this.service.create(dto, req.user.schoolId);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<CreateClassroomDto>) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "principal")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/bulk-transfer")
  bulkTransfer(@Param("id") id: string, @Body() body: { toClassroomId: string }) {
    return this.service.bulkTransfer(id, body.toClassroomId);
  }
}
