import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { LessonsService } from "./lessons.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null; fullName?: string } }

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
  getAll(@Req() req: ReqUser) {
    return this.service.getAll(req.user.schoolId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin", "class_teacher", "principal", "vice_principal")
  create(
    @Req() req: ReqUser,
    @Body() body: {
      subject: string;
      classroomId?: string;
      cabinet?: string;
      lessonTime?: string;
      date?: string;
      lessonTopic?: string;
      visitPurpose?: string;
      lessonPurpose?: string;
      equipment?: string;
    },
  ) {
    return this.service.create({
      subject: body.subject,
      classroomId: body.classroomId,
      cabinet: body.cabinet,
      lessonTime: body.lessonTime,
      date: body.date ? new Date(body.date) : undefined,
      lessonTopic: body.lessonTopic,
      visitPurpose: body.visitPurpose,
      lessonPurpose: body.lessonPurpose,
      equipment: body.equipment,
      teacher: { id: req.user.id } as never,
      schoolId: req.user.schoolId ?? undefined,
    });
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() body: Partial<{
      subject: string;
      classroomId: string;
      cabinet: string;
      lessonTime: string;
      date: string;
      lessonTopic: string;
      visitPurpose: string;
      lessonPurpose: string;
      equipment: string;
      status: "planned" | "conducted" | "analyzed";
    }>,
  ) {
    const data: Record<string, unknown> = { ...body };
    if (body.date) data.date = new Date(body.date);
    return this.service.update(id, data);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin", "class_teacher", "principal", "vice_principal")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Get(":id/analysis")
  getAnalysis(@Param("id") id: string) {
    return this.service.getAnalysis(id);
  }

  @Post(":id/analysis")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  async saveAnalysis(
    @Param("id") id: string,
    @Req() req: ReqUser,
    @Body() body: Record<string, unknown>,
  ) {
    const analysis = await this.service.saveAnalysis(id, req.user.id, body as never);
    if (!body.isDraft) {
      await this.service.update(id, { status: "analyzed" });
    }
    return analysis;
  }

  @Get(":id/analysis/pdf")
  async getAnalysisPdf(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.service.generateAnalysisPdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analysis-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
