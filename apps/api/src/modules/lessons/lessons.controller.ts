import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { LessonsService } from "./lessons.service";

interface ReqUser { user: { id: string; role: string } }

@Controller("lessons")
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly service: LessonsService) {}

  @Get()
  getMyLessons(@Req() req: ReqUser) {
    return this.service.getForTeacher(req.user.id);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  getAll() {
    return this.service.getAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  create(
    @Req() req: ReqUser,
    @Body() body: { title: string; subject: string; grade: number; date?: string; description?: string },
  ) {
    return this.service.create({
      title: body.title,
      subject: body.subject,
      grade: body.grade,
      date: body.date ? new Date(body.date) : undefined,
      description: body.description,
      teacher: { id: req.user.id } as never,
    });
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: Partial<{ title: string; description: string; status: "planned" | "conducted" | "reviewed"; directorComment: string; fileUrls: string[] }>,
  ) {
    return this.service.update(id, body as never);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
