import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { ClassHoursService } from "./class-hours.service";
import { ClassHourTopic } from "../schools/entities/class-hour.entity";

interface ReqUser { user: { id: string } }

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
  @Roles("admin", "principal", "vice_principal")
  getAll() {
    return this.service.getAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("class_teacher", "admin")
  create(
    @Req() req: ReqUser,
    @Body() body: { title: string; topic?: ClassHourTopic; date?: string; duration?: number; notes?: string; classroomId: string },
  ) {
    return this.service.create({
      title: body.title,
      topic: body.topic ?? "other",
      date: body.date ? new Date(body.date) : undefined,
      duration: body.duration,
      notes: body.notes,
      classTeacher: { id: req.user.id } as never,
      classroom: { id: body.classroomId } as never,
    });
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("class_teacher", "admin")
  update(@Param("id") id: string, @Body() body: Partial<{ title: string; notes: string; fileUrls: string[] }>) {
    return this.service.update(id, body as never);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("class_teacher", "admin")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
