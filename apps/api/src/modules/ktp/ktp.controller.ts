import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { KtpService } from "./ktp.service";
import { KtpStatus } from "../schools/entities/ktp-review.entity";

interface ReqUser { user: { id: string; role: string; schoolId?: string | null } }

@Controller("ktp")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin", "principal", "vice_principal", "teacher", "class_teacher")
export class KtpController {
  constructor(private readonly service: KtpService) {}

  @Get("files")
  @Roles("admin", "principal", "vice_principal")
  getFiles(@Query("section") section: string, @Req() req: ReqUser) {
    return this.service.getFilesWithReviews(section ?? "", req.user.schoolId);
  }

  @Patch("reviews/:fileId")
  @Roles("admin", "principal", "vice_principal")
  upsertReview(
    @Param("fileId") fileId: string,
    @Body() body: { status: KtpStatus; comment?: string },
    @Req() req: ReqUser,
  ) {
    return this.service.upsertReview(fileId, body, req.user.id);
  }
}
