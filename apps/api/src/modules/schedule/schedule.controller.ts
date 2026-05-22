import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ScheduleService } from "./schedule.service";
import { ADMIN_ROLES, ALL_TEACHER_ROLES } from "../../common/roles.constants";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("schedule")
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(...ALL_TEACHER_ROLES, "student")
  getMySchedule(@Req() req: ReqUser) {
    return this.scheduleService.getForTeacher(req.user.id);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getAll() {
    return this.scheduleService.getAll();
  }

  @Get("classroom/:id")
  @UseGuards(RolesGuard)
  @Roles(...ALL_TEACHER_ROLES, ...ADMIN_ROLES)
  getForClassroom(@Param("id") id: string) {
    return this.scheduleService.getForClassroom(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin", "teacher")
  create(@Body() body: { dayOfWeek: number; period: number; subject: string; startTime?: string; endTime?: string; classroomId: string; teacherId?: string }) {
    return this.scheduleService.upsert({
      dayOfWeek: body.dayOfWeek,
      period: body.period,
      subject: body.subject,
      startTime: body.startTime,
      endTime: body.endTime,
      classroom: { id: body.classroomId } as never,
      teacher: body.teacherId ? { id: body.teacherId } as never : undefined,
    });
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin", "teacher")
  remove(@Param("id") id: string) {
    return this.scheduleService.remove(id);
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getAdminSchedule(
    @Req() req: ReqUser,
    @Query("classroomId") classroomId?: string,
    @Query("version") version?: string,
    @Query("academicYear") academicYear?: string,
  ) {
    const schoolId = req.user.schoolId ?? "";
    return this.scheduleService.getAdminSchedule(schoolId, classroomId, version ?? "main", academicYear);
  }

  @Post("admin")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  adminUpsert(
    @Req() req: ReqUser,
    @Body() body: {
      classroomId: string; teacherId?: string; subject: string;
      dayOfWeek: number; period: number; room?: string;
      version?: string; academicYear?: string;
    },
  ) {
    const schoolId = req.user.schoolId ?? "";
    return this.scheduleService.adminUpsert({ ...body, schoolId });
  }

  @Delete("admin/:id")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  adminRemove(@Param("id") id: string) {
    return this.scheduleService.remove(id);
  }

  @Get("admin/versions")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getVersions(@Req() req: ReqUser) {
    const schoolId = req.user.schoolId ?? "";
    return this.scheduleService.getVersions(schoolId);
  }

  @Post("admin/versions")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  createVersion(
    @Req() req: ReqUser,
    @Body() body: { name: string },
  ) {
    return { version: body.name };
  }

  @Get("admin/export")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  async exportCsv(
    @Req() req: ReqUser,
    @Query("classroomId") classroomId: string | undefined,
    @Query("version") version: string | undefined,
    @Res() res: Response,
  ) {
    const schoolId = req.user.schoolId ?? "";
    const csv = await this.scheduleService.exportCsv(schoolId, classroomId, version ?? "main");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="schedule.csv"`);
    res.send(csv);
  }
}
