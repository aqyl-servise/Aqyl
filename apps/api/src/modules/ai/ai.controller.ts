import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { AiChatService } from "./ai.service";
import { STAFF_ROLES, ALL_TEACHER_ROLES } from "../../common/roles.constants";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

const CHAT_ROLES = [...STAFF_ROLES, ...ALL_TEACHER_ROLES] as const;

@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CHAT_ROLES)
@Throttle({ short: { limit: 5, ttl: 60_000 } })
export class AiController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post("chat")
  chat(
    @Req() req: ReqUser,
    @Body() body: {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
      section?: string;
      context?: { subject?: string; grade?: number; topic?: string; classroomName?: string; studentCount?: number; role?: string };
      language?: string;
      pageContext?: string; // legacy field
    },
  ) {
    return this.aiChatService.chat(
      body.message ?? "",
      body.history ?? [],
      body.section ?? body.pageContext ?? "default",
      body.context ?? {},
      body.language ?? "ru",
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

}
