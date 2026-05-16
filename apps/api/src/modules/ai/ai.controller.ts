import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AiChatService } from "./ai.service";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@Controller("ai")
@UseGuards(JwtAuthGuard)
@Throttle({ short: { limit: 5, ttl: 60_000 } })
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post("chat")
  chat(@Req() req: ReqUser, @Body() body: { message: string; context?: string; pageContext?: string }) {
    return this.aiChatService.chat(
      body.message ?? "",
      body.context ?? "",
      body.pageContext ?? "",
      { userId: req.user.id, schoolId: req.user.schoolId ?? "", role: req.user.role },
    );
  }

  @Post("generate-assignment")
  generateAssignment(@Req() req: ReqUser, @Body() body: { subject: string; grade: string; topic: string; type: string }) {
    return this.aiChatService.generateAssignment(
      body.subject ?? "",
      body.grade ?? "",
      body.topic ?? "",
      body.type ?? "задание",
      { userId: req.user.id, schoolId: req.user.schoolId ?? "", role: req.user.role },
    );
  }

  @Post("generate-lesson-plan")
  generateLessonPlan(@Req() req: ReqUser, @Body() body: { subject: string; grade: string; topic: string; duration: number }) {
    return this.aiChatService.generateLessonPlan(
      body.subject ?? "",
      body.grade ?? "",
      body.topic ?? "",
      body.duration ?? 45,
      { userId: req.user.id, schoolId: req.user.schoolId ?? "", role: req.user.role },
    );
  }
}
