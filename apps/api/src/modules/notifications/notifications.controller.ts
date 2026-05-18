import { Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { NotificationsService } from "./notifications.service";

interface ReqUser { user: { id: string } }

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("teacher", "class_teacher")
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get("my")
  getMyNotifications(@Req() req: ReqUser) {
    return this.svc.getMyNotifications(req.user.id);
  }

  @Get("my/count")
  getUnreadCount(@Req() req: ReqUser) {
    return this.svc.getUnreadCount(req.user.id);
  }

  @Patch("mark-all-read")
  markAllRead(@Req() req: ReqUser) {
    return this.svc.markAllRead(req.user.id);
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @Req() req: ReqUser) {
    return this.svc.markRead(id, req.user.id);
  }
}
