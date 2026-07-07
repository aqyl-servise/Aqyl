import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SocialPedagogueService } from "./social-pedagogue.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

const READ_ROLES = ["admin", "principal", "vice_principal", "vice_principal_academic", "vice_principal_education", "social_pedagogue"] as const;
const WRITE_ROLES = ["admin", "principal", "vice_principal_education", "social_pedagogue"] as const;

@Controller("social-pedagogue")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...WRITE_ROLES)
export class SocialPedagogueController {
  constructor(private readonly service: SocialPedagogueService) {}

  // ── Nutrition Students ──────────────────────────────────────────────────
  @Get("nutrition/students")
  @Roles(...READ_ROLES)
  getNutritionStudents(@Req() req: ReqUser, @Query("academicYear") academicYear?: string) {
    return this.service.getNutritionStudents(req.user.schoolId ?? "", academicYear);
  }

  @Post("nutrition/students")
  upsertNutritionStudent(
    @Req() req: ReqUser,
    @Body() body: { studentId: string; nutritionType: string; academicYear?: string; notes?: string },
  ) {
    return this.service.upsertNutritionStudent({ ...body, schoolId: req.user.schoolId ?? "" });
  }

  @Delete("nutrition/students/:id")
  removeNutritionStudent(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.removeNutritionStudent(id, req.user.schoolId);
  }

  // ── Nutrition Orders ────────────────────────────────────────────────────
  @Get("nutrition/orders")
  @Roles(...READ_ROLES)
  getNutritionOrders(@Req() req: ReqUser) {
    return this.service.getNutritionOrders(req.user.schoolId ?? "");
  }

  @Post("nutrition/orders")
  createNutritionOrder(
    @Req() req: ReqUser,
    @Body() body: { title: string; fileUrl?: string },
  ) {
    return this.service.createNutritionOrder({ ...body, schoolId: req.user.schoolId ?? "" });
  }

  @Delete("nutrition/orders/:id")
  removeNutritionOrder(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.removeNutritionOrder(id, req.user.schoolId);
  }

  @Get("nutrition/export")
  @Roles(...READ_ROLES)
  async exportNutrition(@Req() req: ReqUser, @Res() res: Response) {
    const csv = await this.service.exportNutritionCsv(req.user.schoolId ?? "");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="nutrition.csv"`);
    res.send(csv);
  }

  // ── Special Attention Students ──────────────────────────────────────────
  @Get("special-attention")
  @Roles(...READ_ROLES)
  getSpecialAttention(@Req() req: ReqUser) {
    return this.service.getSpecialAttentionStudents(req.user.schoolId ?? "");
  }

  @Post("special-attention")
  upsertSpecialAttention(
    @Req() req: ReqUser,
    @Body() body: { studentId: string; reason: string; documents?: { title: string; fileUrl: string }[] },
  ) {
    return this.service.upsertSpecialAttentionStudent({ ...body, schoolId: req.user.schoolId ?? "" });
  }

  @Delete("special-attention/:id")
  removeSpecialAttention(@Param("id") id: string, @Req() req: ReqUser) {
    return this.service.removeSpecialAttentionStudent(id, req.user.schoolId);
  }

  @Post("special-attention/:id/documents")
  addDocument(
    @Param("id") id: string,
    @Body() body: { title: string; fileUrl: string },
    @Req() req: ReqUser,
  ) {
    return this.service.addDocument(id, body, req.user.schoolId);
  }

  @Get("special-attention/export")
  @Roles(...READ_ROLES)
  async exportSpecial(@Req() req: ReqUser, @Res() res: Response) {
    const csv = await this.service.exportSpecialCsv(req.user.schoolId ?? "");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="special-students.csv"`);
    res.send(csv);
  }
}
