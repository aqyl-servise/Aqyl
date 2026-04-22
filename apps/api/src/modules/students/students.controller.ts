import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { StudentsService, CreateStudentDto } from "./students.service";

interface ReqUser { id: string; role: string }

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "teacher", "class_teacher")
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  findAll(@Req() req: { user: ReqUser }, @Query("classroomId") classroomId?: string) {
    if (["admin", "principal", "vice_principal"].includes(req.user.role)) {
      return this.service.findAll(classroomId);
    }
    return this.service.findByTeacher(req.user.id, classroomId);
  }

  @Get("classrooms")
  getClassrooms() {
    return this.service.getClassrooms();
  }

  @Get("class-teachers")
  getClassTeachers() {
    return this.service.getClassTeachers();
  }

  @Post()
  @Roles("admin", "principal", "vice_principal", "teacher")
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles("admin", "principal", "vice_principal", "teacher")
  update(@Param("id") id: string, @Body() dto: Partial<CreateStudentDto>) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "principal")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
