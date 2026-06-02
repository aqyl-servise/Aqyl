import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { GeneratorsService } from "./generators.service";
import { ALL_TEACHER_ROLES } from "../../common/roles.constants";

interface ReqUser { user: { id: string; role: string; schoolId?: string } }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_TEACHER_ROLES)
@Controller("generators")
export class GeneratorsController {
  constructor(private readonly generatorsService: GeneratorsService) {}

  @Post("lesson-plan")
  lessonPlan(
    @Req() req: ReqUser,
    @Body() body: GenerateLessonPlanDto,
  ) {
    return this.generatorsService.generateLessonPlan(req.user.id, req.user.schoolId, body, req.user.role);
  }

  @Post("task-set")
  taskSet(
    @Req() req: ReqUser,
    @Body() body: GenerateTaskSetDto,
  ) {
    return this.generatorsService.generateTaskSet(req.user.id, body, req.user.schoolId, req.user.role);
  }
}
