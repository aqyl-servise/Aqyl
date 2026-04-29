import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ClassHoursService } from "./class-hours.service";
import { ClassHourTopic } from "../schools/entities/class-hour.entity";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

const ADMIN_ROLES = ["admin", "principal", "vice_principal"] as const;
const WRITE_ROLES = ["class_teacher", "admin", "principal", "vice_principal"] as const;

@Controller("class-hours")
@UseGuards(JwtAuthGuard)
export class ClassHoursController {
  constructor(private readonly service: ClassHoursService) {}

  @Get()
  getMine(@Req() req: ReqUser) {
    return this.service.getForTeacher(req.user.id);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles(...ADMIN_ROLES)
  getAll(@Req() req: ReqUser) {
    return this.service.getAll(req.user.schoolId);
  }

  @Get("schedule")
  getSchedule(@Req() req: ReqUser) {
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(req.user.role);
    return this.service.getSchedule(req.user.id, req.user.schoolId, isAdmin);
  }

  @Get(":id/history")
  getHistory(@Param("id") id: string) {
    return this.service.getHistory(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...WRITE_ROLES)
  create(
    @Req() req: ReqUser,
    @Body() body: {
      title?: string;
      topic?: ClassHourTopic;
      dayOfWeek?: string;
      time?: string;
      date?: string;
      duration?: number;
      notes?: string;
      comment?: string;
      status?: string;
      classroomId: string;
    },
  ) {
    return this.service.create({
      title: body.title,
      topic: body.topic ?? "other",
      dayOfWeek: body.dayOfWeek as never,
      time: body.time,
      date: body.date ? new Date(body.date) : undefined,
      duration: body.duration,
      notes: body.notes,
      comment: body.comment,
      status: (body.status as never) ?? "planned",
      classTeacher: { id: req.user.id } as never,
      classroom: { id: body.classroomId } as never,
      schoolId: req.user.schoolId ?? undefined,
    });
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(...WRITE_ROLES)
  update(
    @Param("id") id: string,
    @Req() req: ReqUser,
    @Body() body: Record<string, unknown>,
  ) {
    const changeDesc = typeof body.changeDescription === "string" ? body.changeDescription : undefined;
    const { changeDescription: _cd, ...updateData } = body;
    if (updateData.date && typeof updateData.date === "string") {
      updateData.date = new Date(updateData.date) as never;
    }
    return this.service.update(id, updateData, req.user.id, changeDesc);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(...WRITE_ROLES)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
