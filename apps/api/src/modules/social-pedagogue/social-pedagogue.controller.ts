import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SocialPedagogueService } from "./social-pedagogue.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

const ALLOWED_ROLES = ["admin", "principal", "social_pedagogue", "vice_principal_education"] as const;

@Controller("social-pedagogue")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALLOWED_ROLES)
export class SocialPedagogueController {
  constructor(private readonly service: SocialPedagogueService) {}

  // ── Nutrition Students ──────────────────────────────────────────────────
  @Get("nutrition/students")
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
  removeNutritionStudent(@Param("id") id: string) {
    return this.service.removeNutritionStudent(id);
  }

  // ── Nutrition Orders ────────────────────────────────────────────────────
  @Get("nutrition/orders")
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
  removeNutritionOrder(@Param("id") id: string) {
    return this.service.removeNutritionOrder(id);
  }

  // ── Special Attention Students ──────────────────────────────────────────
  @Get("special-attention")
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
  removeSpecialAttention(@Param("id") id: string) {
    return this.service.removeSpecialAttentionStudent(id);
  }

  @Post("special-attention/:id/documents")
  addDocument(
    @Param("id") id: string,
    @Body() body: { title: string; fileUrl: string },
  ) {
    return this.service.addDocument(id, body);
  }
}
