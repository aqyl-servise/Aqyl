import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AssignmentsService } from "./assignments.service";

interface ReqUser { user: { id: string; role: string } }

@Controller("assignments")
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get()
  getMyAssignments(@Req() req: ReqUser) {
    return this.service.getForTeacher(req.user.id);
  }

  @Get("all")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  getAll() {
    return this.service.getAll();
  }

  @Get("classroom/:id")
  getForClassroom(@Param("id") id: string) {
    return this.service.getForClassroom(id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Get(":id/submissions")
  getSubmissions(@Param("id") id: string) {
    return this.service.getSubmissionsForAssignment(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  create(
    @Req() req: ReqUser,
    @Body() body: { title: string; description?: string; subject: string; dueDate?: string; maxScore?: number; classroomId: string; assignmentType?: string; status?: string },
  ) {
    return this.service.create({
      title: body.title,
      description: body.description,
      subject: body.subject,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      maxScore: body.maxScore ?? 100,
      status: (body.status as never) ?? "draft",
      assignmentType: body.assignmentType,
      teacher: { id: req.user.id } as never,
      classroom: { id: body.classroomId } as never,
    });
  }

  @Patch(":id/publish")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  publish(@Param("id") id: string) {
    return this.service.publish(id);
  }

  @Patch(":id/close")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  close(@Param("id") id: string) {
    return this.service.close(id);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  update(@Param("id") id: string, @Body() body: Partial<{ title: string; description: string; dueDate: string; status: string; assignmentType: string }>) {
    const update: Record<string, unknown> = { ...body };
    if (body.dueDate) update.dueDate = new Date(body.dueDate);
    return this.service.update(id, update as never);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Post(":id/submit")
  submitWork(
    @Param("id") assignmentId: string,
    @Body() body: { studentId: string; content?: string; fileUrl?: string },
  ) {
    return this.service.submitWork({
      assignment: { id: assignmentId } as never,
      student: { id: body.studentId } as never,
      content: body.content,
      fileUrl: body.fileUrl,
    });
  }

  @Patch("submissions/:id/grade")
  @UseGuards(RolesGuard)
  @Roles("teacher", "admin")
  grade(@Param("id") id: string, @Body() body: { score: number }) {
    return this.service.gradeSubmission(id, body.score);
  }
}
