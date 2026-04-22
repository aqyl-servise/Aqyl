import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { GenerateLessonPlanDto } from "./dto/generate-lesson-plan.dto";
import { GenerateTaskSetDto } from "./dto/generate-task-set.dto";
import { GeneratorsService } from "./generators.service";

@UseGuards(JwtAuthGuard)
@Controller("generators")
export class GeneratorsController {
  constructor(private readonly generatorsService: GeneratorsService) {}

  @Post("lesson-plan")
  lessonPlan(
    @Req() req: { user: { id: string } },
    @Body() body: GenerateLessonPlanDto,
  ) {
    return this.generatorsService.generateLessonPlan(req.user.id, body);
  }

  @Post("task-set")
  taskSet(
    @Req() req: { user: { id: string } },
    @Body() body: GenerateTaskSetDto,
  ) {
    return this.generatorsService.generateTaskSet(req.user.id, body);
  }
}
