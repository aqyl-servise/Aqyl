import { Controller, Get, Post, Body, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { TokenService } from "./token.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("tokens")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TokensController {
  constructor(private readonly tokenService: TokenService) {}

  @Get("status")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic",
    "vice_principal_education", "teacher", "class_teacher")
  getStatus(@Req() req: ReqUser) {
    return this.tokenService.checkLimit(req.user.schoolId ?? "");
  }

  @Get("usage")
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  getUsage(@Req() req: ReqUser, @Query("days") days = 30) {
    return this.tokenService.getUsageStats(req.user.schoolId ?? "", +days);
  }

  @Post("packages")
  @Roles("admin")
  createPackage(@Body() dto: {
    schoolId: string;
    totalTokens: number;
    periodDays: number;
    planType: string;
    notes?: string;
  }) {
    return this.tokenService.createPackage(dto);
  }
}
