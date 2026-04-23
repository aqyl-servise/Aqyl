import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ClassroomsService, CreateClassroomDto } from "./classrooms.service";

@Controller("classrooms")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal")
export class ClassroomsController {
  constructor(private readonly service: ClassroomsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get("class-teachers")
  getClassTeachers() {
    return this.service.getClassTeachers();
  }

  @Post()
  create(@Body() dto: CreateClassroomDto) {
    return this.service.create(dto);
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
