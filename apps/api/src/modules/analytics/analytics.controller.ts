import {
  BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";
import { isStaffRole } from "../../common/roles.constants";
import { AiAnalyzeDto } from "./dto/ai-analyze.dto";

interface ReqUser { user: { id: string; role: string; classroomIds?: string[]; schoolId?: string | null } }

@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("upload")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  @UseInterceptors(
    FileInterceptor("file", {
      // Bound in-memory upload size to avoid RAM exhaustion under load (10MB).
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = new Set([
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/csv",
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(new BadRequestException(`File type ${file.mimetype} is not allowed`), false);
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("Excel file is required");
    return this.analyticsService.parseWorkbook(file.buffer);
  }

  @Get("live-summary")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher", "class_teacher")
  getLiveSummary(@Req() req: ReqUser) {
    return this.analyticsService.getLiveSummary(req.user.schoolId ?? undefined);
  }

  @Get("school")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  getSchool(@Req() req: ReqUser) {
    const isAdmin = isStaffRole(req.user.role);
    return this.analyticsService.getSchoolStats(
      isAdmin ? undefined : (req.user.classroomIds ?? []),
      req.user.schoolId ?? undefined,
    );
  }

  @Get("classes")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  getClasses(@Req() req: ReqUser) {
    const isAdmin = isStaffRole(req.user.role);
    return this.analyticsService.getClassesStats(
      isAdmin ? undefined : (req.user.classroomIds ?? []),
      req.user.schoolId ?? undefined,
    );
  }

  @Get("students")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic", "teacher")
  getStudents(@Query("q") q: string) {
    return this.analyticsService.getStudentsStats(q ?? "");
  }

  @Post("ai-analyze")
  @UseGuards(RolesGuard)
  @Roles("admin", "principal", "vice_principal", "vice_principal_academic")
  aiAnalyze(@Body() dto: AiAnalyzeDto, @Req() req: ReqUser) {
    return this.analyticsService.aiAnalyze(dto, { schoolId: req.user.schoolId, userId: req.user.id });
  }
}
