import {
  BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";

interface ReqUser { user: { id: string; role: string; classroomIds?: string[] } }

const ADMIN_ROLES = ["admin", "principal", "vice_principal"];

@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Excel file is required");
    return this.analyticsService.parseWorkbook(file.buffer);
  }

  @Get("school")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "teacher")
  getSchool(@Req() req: ReqUser) {
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    return this.analyticsService.getSchoolStats(isAdmin ? undefined : (req.user.classroomIds ?? []));
  }

  @Get("classes")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "teacher")
  getClasses(@Req() req: ReqUser) {
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    return this.analyticsService.getClassesStats(isAdmin ? undefined : (req.user.classroomIds ?? []));
  }

  @Get("students")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "teacher")
  getStudents(@Query("q") q: string) {
    return this.analyticsService.getStudentsStats(q ?? "");
  }

  @Post("ai-analyze")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal")
  aiAnalyze(@Body() body: Record<string, unknown>) {
    return this.analyticsService.aiAnalyze(body);
  }
}
