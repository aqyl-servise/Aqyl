import { Body, Controller, Delete, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { KmzhCacheService } from "./kmzh-cache.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("kmzh-cache")
@UseGuards(JwtAuthGuard, RolesGuard)
export class KmzhCacheController {
  constructor(private readonly svc: KmzhCacheService) {}

  @Get("stats")
  @Roles("admin", "principal", "vice_principal")
  getStats(@Req() req: ReqUser) {
    return this.svc.getCacheStats(req.user.schoolId);
  }

  @Delete()
  @Roles("admin")
  async clearCache(@Body() body: { subject?: string; classNumber?: number }) {
    await this.svc.clearCache(body?.subject, body?.classNumber);
    return { ok: true };
  }
}
