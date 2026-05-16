import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { FLService } from "./fl.service";
import { FLTask } from "../schools/entities/fl-task.entity";
import { FLAssignment } from "../schools/entities/fl-assignment.entity";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("fl")
@UseGuards(JwtAuthGuard, RolesGuard)
export class FLController {
  constructor(private readonly svc: FLService) {}

  // ── Task Bank ──────────────────────────────────────────────────────────
  @Get("tasks")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  getTasks(
    @Req() req: ReqUser,
    @Query("subject") subject?: string,
    @Query("grade") grade?: string,
    @Query("direction") direction?: string,
    @Query("difficulty") difficulty?: string,
    @Query("source") source?: string,
  ) {
    return this.svc.getTasks(req.user.schoolId ?? "", { subject, grade: grade ? Number(grade) : undefined, direction, difficulty, source });
  }

  @Post("tasks")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  createTask(@Body() body: Partial<FLTask>, @Req() req: ReqUser) {
    return this.svc.createTask({ ...body, schoolId: req.user.schoolId ?? "", teacherId: req.user.id });
  }

  @Patch("tasks/:id")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  updateTask(@Param("id") id: string, @Body() body: Partial<FLTask>, @Req() req: ReqUser) {
    return this.svc.updateTask(id, req.user.id, body);
  }

  @Delete("tasks/:id")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  deleteTask(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.deleteTask(id, req.user.id);
  }

  // ── Assignments ────────────────────────────────────────────────────────
  @Get("assignments")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  getAssignments(@Req() req: ReqUser, @Query("classroomId") classroomId?: string) {
    return this.svc.getAssignments(req.user.id, req.user.schoolId ?? "", classroomId);
  }

  @Post("assignments")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  createAssignment(@Body() body: Partial<FLAssignment>, @Req() req: ReqUser) {
    return this.svc.createAssignment({ ...body, teacherId: req.user.id, schoolId: req.user.schoolId ?? "" });
  }

  @Patch("assignments/:id")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  updateAssignment(@Param("id") id: string, @Body() body: Partial<FLAssignment>, @Req() req: ReqUser) {
    return this.svc.updateAssignment(id, req.user.id, body);
  }

  @Patch("assignments/:id/publish")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  publishAssignment(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.publishAssignment(id, req.user.id);
  }

  @Patch("assignments/:id/close")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  closeAssignment(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.closeAssignment(id, req.user.id);
  }

  @Get("assignments/:id/submissions")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  getSubmissions(@Param("id") assignmentId: string) {
    return this.svc.getSubmissions(assignmentId);
  }

  @Post("assignments/:id/submit")
  @Roles("student")
  submitAnswers(
    @Param("id") assignmentId: string,
    @Body() body: { answers: { taskId: string; answer: string }[] },
    @Req() req: ReqUser,
  ) {
    return this.svc.submitAnswers(assignmentId, req.user.id, body.answers);
  }

  @Patch("submissions/:id/grade")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  gradeSubmission(
    @Param("id") id: string,
    @Body() body: { answers: { taskId: string; score?: number; teacherComment?: string }[]; totalScore?: number },
  ) {
    return this.svc.gradeSubmission(id, body);
  }

  // ── Analytics ──────────────────────────────────────────────────────────
  @Get("analytics/school")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getSchoolAnalytics(@Req() req: ReqUser) {
    return this.svc.getSchoolAnalytics(req.user.schoolId ?? "");
  }

  @Get("analytics/class/:classroomId")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  getClassAnalytics(@Param("classroomId") classroomId: string) {
    return this.svc.getClassAnalytics(classroomId);
  }

  @Get("analytics/student/:studentId")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  getStudentAnalytics(@Param("studentId") studentId: string) {
    return this.svc.getStudentAnalytics(studentId);
  }

  // ── AI ─────────────────────────────────────────────────────────────────
  @Post("ai/generate-task")
  @Roles("teacher", "class_teacher", "admin", "principal", "vice_principal", "vice_principal_academic")
  generateTask(@Req() req: ReqUser, @Body() body: { subject: string; grade: number; direction: string; difficulty: string; taskType: string; topic: string }) {
    return this.svc.generateTask(body, { userId: req.user.id, schoolId: req.user.schoolId ?? "", role: req.user.role });
  }

  // ── Student portal ─────────────────────────────────────────────────────
  @Get("student/assignments")
  @Roles("student")
  getStudentAssignments(@Req() req: ReqUser) {
    return this.svc.getStudentAssignments(req.user.id);
  }

  @Get("student/assignments/:id")
  @Roles("student")
  getStudentAssignmentDetail(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.getStudentAssignmentDetail(id, req.user.id);
  }

  @Post("student/assignments/:id/start")
  @Roles("student")
  startAssignment(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.startAssignment(id, req.user.id);
  }

  @Patch("student/submissions/:id")
  @Roles("student")
  updateSubmission(@Param("id") id: string, @Body() body: { answers?: { taskId: string; answer: string }[] }, @Req() req: ReqUser) {
    return this.svc.updateSubmission(id, req.user.id, body);
  }
}
