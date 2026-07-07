import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ClassHoursService } from "./class-hours.service";
import { ClassHourTopic } from "../schools/entities/class-hour.entity";
import { isStaffRole } from "../../common/roles.constants";
import { UpdateClassHourDto } from "./dto/update-class-hour.dto";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null; isClassTeacher?: boolean } }

const ADMIN_ROLES = ["admin", "principal", "vice_principal", "vice_principal_academic"] as const;
const WRITE_ROLES = ["class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic"] as const;

function assertCanWrite(user: ReqUser["user"]) {
  const ok = (WRITE_ROLES as readonly string[]).includes(user.role) ||
    (user.role === "teacher" && user.isClassTeacher === true);
  if (!ok) throw new ForbiddenException("Insufficient permissions");
}

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
    const isAdmin = isStaffRole(req.user.role);
    return this.service.getSchedule(req.user.id, req.user.schoolId, isAdmin);
  }

  @Get(":id/history")
  getHistory(@Param("id") id: string) {
    return this.service.getHistory(id);
  }

  @Post()
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
    assertCanWrite(req.user);
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
  update(
    @Param("id") id: string,
    @Req() req: ReqUser,
    @Body() dto: UpdateClassHourDto,
  ) {
    assertCanWrite(req.user);
    const { changeDescription, date, ...rest } = dto;
    const updateData: Record<string, unknown> = { ...rest };
    if (date) updateData.date = new Date(date);
    return this.service.update(id, updateData, req.user.id, changeDescription, req.user.schoolId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: ReqUser) {
    assertCanWrite(req.user);
    return this.service.remove(id, req.user.schoolId);
  }
}
