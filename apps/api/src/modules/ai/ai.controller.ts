import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AiChatService } from "./ai.service";

@Controller("ai")
@UseGuards(JwtAuthGuard)
@Throttle({ short: { limit: 5, ttl: 60_000 } })
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post("chat")
  chat(@Body() body: { message: string; context?: string; pageContext?: string }) {
    return this.aiChatService.chat(
      body.message ?? "",
      body.context ?? "",
      body.pageContext ?? "",
    );
  }

  @Post("generate-assignment")
  generateAssignment(@Body() body: { subject: string; grade: string; topic: string; type: string }) {
    return this.aiChatService.generateAssignment(
      body.subject ?? "",
      body.grade ?? "",
      body.topic ?? "",
      body.type ?? "задание",
    );
  }

  @Post("generate-lesson-plan")
  generateLessonPlan(@Body() body: { subject: string; grade: string; topic: string; duration: number }) {
    return this.aiChatService.generateLessonPlan(
      body.subject ?? "",
      body.grade ?? "",
      body.topic ?? "",
      body.duration ?? 45,
    );
  }
}
