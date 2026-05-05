import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SorSochService } from "./sor-soch.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("sor-soch")
@UseGuards(JwtAuthGuard)
export class SorSochController {
  constructor(private readonly service: SorSochService) {}

  @Get()
  findAll(
    @Req() req: ReqUser,
    @Query("type") type?: "sor" | "soch",
    @Query("subject") subject?: string,
    @Query("classroomId") classroomId?: string,
    @Query("quarter") quarter?: string,
    @Query("teacherId") teacherId?: string,
  ) {
    const isAdmin = ["admin", "principal", "vice_principal"].includes(req.user.role);
    return this.service.findAll({
      schoolId: req.user.schoolId ?? undefined,
      teacherId: isAdmin ? teacherId : req.user.id,
      type,
      subject,
      classroomId,
      quarter,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin", "principal", "vice_principal")
  create(
    @Req() req: ReqUser,
    @Body() body: { title: string; type: "sor" | "soch"; subject?: string; classroomId?: string; quarter?: string; fileUrl?: string },
  ) {
    return this.service.create({
      title: body.title,
      type: body.type,
      subject: body.subject,
      classroomId: body.classroomId,
      quarter: body.quarter,
      fileUrl: body.fileUrl,
      teacherId: req.user.id,
      schoolId: req.user.schoolId ?? undefined,
      teacher: { id: req.user.id } as never,
      classroom: body.classroomId ? { id: body.classroomId } as never : undefined,
    });
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin", "principal", "vice_principal")
  update(
    @Param("id") id: string,
    @Body() body: Partial<{ title: string; subject: string; classroomId: string; quarter: string; fileUrl: string }>,
  ) {
    return this.service.update(id, body as never);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin", "principal", "vice_principal")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
