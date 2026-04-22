import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ScheduleService } from "./schedule.service";

interface ReqUser { user: { id: string; role: string } }

@Controller("schedule")
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getMySchedule(@Req() req: ReqUser) {
    return this.scheduleService.getForTeacher(req.user.id);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  getAll() {
    return this.scheduleService.getAll();
  }

  @Get("classroom/:id")
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
}
