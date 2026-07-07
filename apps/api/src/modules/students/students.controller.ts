import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { StudentsService, CreateStudentDto } from "./students.service";
import { isStaffRole } from "../../common/roles.constants";

interface ReqUser { id: string; role: string; schoolId?: string | null }

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "vice_principal_academic",
  "vice_principal_education", "psychologist", "social_pedagogue",
  "teacher", "class_teacher")
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Get()
  findAll(
    @Req() req: { user: ReqUser },
    @Query("classroomId") classroomId?: string,
    @Query("grades") grades?: string,
    @Query("schoolWide") schoolWide?: string,
  ) {
    if (isStaffRole(req.user.role)) {
      return this.service.findAll(classroomId, req.user.schoolId);
    }
    if (schoolWide === "true" && grades) {
      const gradeArr = grades.split(",").map(Number).filter((n) => !isNaN(n));
      if (req.user.schoolId) {
        return this.service.findAllBySchoolAndGrades(req.user.schoolId, gradeArr);
      }
      return this.service.findAllByTeacherSchoolAndGrades(req.user.id, gradeArr);
    }
    return this.service.findByTeacher(req.user.id, classroomId);
  }

  @Get("classrooms")
  getClassrooms(@Req() req: { user: ReqUser }) {
    if (isStaffRole(req.user.role)) {
      return this.service.getClassrooms(req.user.schoolId);
    }
    return this.service.getTeacherClassrooms(req.user.id);
  }

  @Get("class-teachers")
  getClassTeachers(@Req() req: { user: ReqUser }) {
    return this.service.getClassTeachers(req.user.schoolId);
  }

  @Post()
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  update(@Param("id") id: string, @Body() dto: Partial<CreateStudentDto>, @Req() req: { user: ReqUser }) {
    return this.service.update(id, dto, req.user.schoolId);
  }

  @Delete(":id")
  @Roles("admin", "principal")
  remove(@Param("id") id: string, @Req() req: { user: ReqUser }) {
    return this.service.remove(id, req.user.schoolId);
  }

  @Post(":id/transfer")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  transfer(
    @Param("id") id: string,
    @Body() body: { classroomId: string; note?: string },
    @Req() req: { user: ReqUser },
  ) {
    return this.service.transfer(id, body.classroomId, body.note, req.user.schoolId);
  }

  @Get(":id/transfers")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getTransferHistory(@Param("id") id: string, @Req() req: { user: ReqUser }) {
    return this.service.getTransferHistory(id, req.user.schoolId);
  }
}
