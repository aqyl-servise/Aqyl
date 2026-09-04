import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SkipSchoolIsolation } from "../../common/decorators/skip-school-isolation.decorator";
import { ALL_TEACHER_ROLES, ADMIN_ROLES } from "../../common/roles.constants";
import { QuizService } from "./quiz.service";
import type { GenerateInput } from "./quiz-generator.service";

type AuthRequest = { user: { id: string; schoolId: string | null; role: string } };

/** Квизы учителя (ТЗ 3.0, слой 3). Как и грамотность, работает и в B2C. */
@SkipSchoolIsolation()
@Controller("quiz")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_TEACHER_ROLES, ...ADMIN_ROLES)
export class QuizController {
  constructor(private readonly service: QuizService) {}

  private ctx(req: AuthRequest) {
    return { userId: req.user.id, schoolId: req.user.schoolId };
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: GenerateInput & { title?: string }) {
    return this.service.create(this.ctx(req), body);
  }

  @Post(":id/session")
  startSession(
    @Param("id") id: string,
    @Req() req: AuthRequest,
    @Body() body: { mode?: "sync" | "async" },
  ) {
    return this.service.startSession(id, this.ctx(req), body?.mode ?? "sync");
  }

  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.list(this.ctx(req));
  }

  @Get(":id")
  getOne(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.service.getOne(id, this.ctx(req));
  }

  @Patch(":id")
  rename(@Param("id") id: string, @Req() req: AuthRequest, @Body() body: { title: string }) {
    return this.service.rename(id, this.ctx(req), body?.title ?? "");
  }

  @Post(":id/questions")
  addQuestions(@Param("id") id: string, @Req() req: AuthRequest, @Body() body: { count?: number }) {
    return this.service.addQuestions(id, this.ctx(req), Number(body?.count) || 3);
  }

  @Patch(":id/questions/:questionId")
  updateQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Req() req: AuthRequest,
    @Body() body: { text?: string; options?: string[]; correctIndex?: number },
  ) {
    return this.service.updateQuestion(id, questionId, this.ctx(req), body ?? {});
  }

  @Delete(":id/questions/:questionId")
  deleteQuestion(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Req() req: AuthRequest,
  ) {
    return this.service.deleteQuestion(id, questionId, this.ctx(req));
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: AuthRequest) {
    return this.service.remove(id, this.ctx(req));
  }
}
