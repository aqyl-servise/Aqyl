import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GiftedService } from "./gifted.service";

interface ReqUser { user: { id: string } }

@Controller("gifted")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "teacher")
export class GiftedController {
  constructor(private readonly svc: GiftedService) {}

  // ── Plans ─────────────────────────────────────────────────────────
  @Get("plans")
  getPlans(@Query("type") type?: string) {
    return this.svc.getPlans(type);
  }

  @Post("plans")
  @Roles("admin", "principal", "vice_principal")
  createPlan(@Body() body: { type: string; title: string; fileUrl?: string }, @Req() req: ReqUser) {
    return this.svc.createPlan({ ...body, uploadedById: req.user.id });
  }

  @Delete("plans/:id")
  @Roles("admin", "principal", "vice_principal")
  removePlan(@Param("id") id: string) {
    return this.svc.removePlan(id);
  }

  // ── Gifted students (school-wide) ─────────────────────────────────
  @Get("students")
  getGiftedStudents(@Query("classroomId") classroomId?: string) {
    return this.svc.getGiftedStudents(classroomId);
  }

  @Post("students")
  @Roles("admin", "principal", "vice_principal")
  markGifted(@Body() body: { studentId: string }) {
    return this.svc.markGifted(body.studentId);
  }

  @Delete("students/:id")
  @Roles("admin", "principal", "vice_principal")
  removeGiftedStudent(@Param("id") id: string) {
    return this.svc.removeGiftedStudent(id);
  }

  // ── Search all students ───────────────────────────────────────────
  @Get("all-students")
  searchStudents(@Query("q") q?: string) {
    return this.svc.searchStudents(q);
  }

  // ── Teachers ──────────────────────────────────────────────────────
  @Get("teachers")
  getTeachers() {
    return this.svc.getTeachers();
  }

  @Get("teachers/:id/students")
  getTeacherStudents(@Param("id") id: string) {
    return this.svc.getTeacherStudents(id);
  }

  @Post("teacher-assignments")
  @Roles("admin", "principal", "vice_principal")
  addAssignment(@Body() body: { teacherId: string; studentId: string }) {
    return this.svc.addTeacherAssignment(body.teacherId, body.studentId);
  }

  @Delete("teacher-assignments/:id")
  @Roles("admin", "principal", "vice_principal")
  removeAssignment(@Param("id") id: string) {
    return this.svc.removeTeacherAssignment(id);
  }

  // ── Materials ─────────────────────────────────────────────────────
  @Get("materials")
  getMaterials(@Query("teacherId") teacherId: string, @Query("category") category?: string) {
    return this.svc.getMaterials(teacherId, category);
  }

  @Post("materials")
  addMaterial(@Body() body: { teacherId: string; category: string; title: string; fileUrl?: string; linkUrl?: string }) {
    return this.svc.addMaterial(body);
  }

  @Delete("materials/:id")
  removeMaterial(@Param("id") id: string) {
    return this.svc.removeMaterial(id);
  }

  // ── Student card ──────────────────────────────────────────────────
  @Get("student-card/:studentId")
  getStudentCard(@Param("studentId") studentId: string) {
    return this.svc.getStudentCard(studentId);
  }

  // ── Achievements ──────────────────────────────────────────────────
  @Post("achievements")
  addAchievement(@Body() body: { studentId: string; title: string; date?: string; level: string; subject?: string; place?: string }) {
    return this.svc.addAchievement(body);
  }

  @Delete("achievements/:id")
  removeAchievement(@Param("id") id: string) {
    return this.svc.removeAchievement(id);
  }
}
