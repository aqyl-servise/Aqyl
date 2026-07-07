import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { RatingService } from "./rating.service";
import { RatingPeriod } from "../schools/entities/teacher-rating.entity";
import { ViolationType } from "../schools/entities/teacher-violation.entity";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("rating")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingController {
  constructor(private readonly svc: RatingService) {}

  @Post("calculate")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  calculateAll(
    @Req() req: ReqUser,
    @Body() body: { period?: RatingPeriod; periodNumber?: number; academicYear?: string },
  ) {
    return this.svc.calculateAll(
      req.user.schoolId ?? "",
      body.period ?? "year",
      body.periodNumber ?? 0,
      body.academicYear ?? "2025-2026",
    );
  }

  @Get("school")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "vice_principal_education")
  getSchoolRatings(
    @Req() req: ReqUser,
    @Query("subject") subject?: string,
    @Query("period") period?: RatingPeriod,
    @Query("periodNumber") periodNumber?: string,
    @Query("academicYear") academicYear?: string,
    @Query("isClassTeacher") isClassTeacher?: string,
  ) {
    return this.svc.getSchoolRatings(req.user.schoolId ?? "", {
      subject,
      period,
      periodNumber: periodNumber !== undefined ? Number(periodNumber) : undefined,
      academicYear,
      isClassTeacher: isClassTeacher !== undefined ? isClassTeacher === "true" : undefined,
    });
  }

  @Get("my")
  @Roles("teacher", "class_teacher")
  getMyRating(
    @Req() req: ReqUser,
    @Query("period") period?: RatingPeriod,
    @Query("periodNumber") periodNumber?: string,
    @Query("academicYear") academicYear?: string,
  ) {
    return this.svc.getTeacherRating(
      req.user.id,
      req.user.schoolId ?? "",
      period ?? "year",
      periodNumber !== undefined ? Number(periodNumber) : 0,
      academicYear ?? "2025-2026",
    );
  }

  @Get("teacher/:teacherId")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getTeacherRating(
    @Param("teacherId") teacherId: string,
    @Req() req: ReqUser,
    @Query("period") period?: RatingPeriod,
    @Query("periodNumber") periodNumber?: string,
    @Query("academicYear") academicYear?: string,
  ) {
    return this.svc.getTeacherRating(
      teacherId,
      req.user.schoolId ?? "",
      period ?? "year",
      periodNumber !== undefined ? Number(periodNumber) : 0,
      academicYear ?? "2025-2026",
    );
  }

  @Get("history/:teacherId")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getRatingHistory(@Param("teacherId") teacherId: string, @Req() req: ReqUser) {
    return this.svc.getRatingHistory(teacherId, req.user.schoolId ?? "");
  }

  @Get("history/my")
  @Roles("teacher", "class_teacher")
  getMyRatingHistory(@Req() req: ReqUser) {
    return this.svc.getRatingHistory(req.user.id, req.user.schoolId ?? "");
  }

  @Patch(":id/adjust")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  adjustRating(
    @Param("id") id: string,
    @Body() body: { manualAdjustment: number; manualComment?: string },
  ) {
    return this.svc.adjustRating(id, body);
  }

  // ── Violations ─────────────────────────────────────────────────────────────
  @Get("violations/my")
  @Roles("teacher", "class_teacher")
  getMyViolations(@Req() req: ReqUser) {
    return this.svc.getViolationsByTeacherId(req.user.id);
  }

  @Post("violations")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  createViolation(
    @Req() req: ReqUser,
    @Body() body: { teacherId: string; type: ViolationType; description: string; date: string; pointsDeducted: number },
  ) {
    return this.svc.createViolation({ ...body, schoolId: req.user.schoolId ?? "", createdBy: req.user.id });
  }

  @Get("violations/:teacherId")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  getViolations(@Param("teacherId") teacherId: string, @Req() req: ReqUser) {
    return this.svc.getViolations(teacherId, req.user.schoolId ?? "");
  }

  @Delete("violations/:id")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  deleteViolation(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.deleteViolation(id, req.user.schoolId);
  }
}
