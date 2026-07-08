import {
  Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { SkipSchoolIsolation } from '../../common/decorators/skip-school-isolation.decorator';
import { ALL_TEACHER_ROLES } from '../../common/roles.constants';
import { LessonPlansService } from './lesson-plans.service';
import { LessonHeaderDto } from './dto/lesson-header.dto';
import { SetStagesDto, GenerateLessonDto, SwapToolDto } from './dto/lesson-actions.dto';

type AuthRequest = { user: { id: string; sub?: string; schoolId: string | null; role: string } };

// КСП generator API. Base path `/lesson-plans` (ТЗ указывал `/lessons`, но он занят
// модулем анализа уроков). B2C-friendly: SkipSchoolIsolation, scoped by userId.
@SkipSchoolIsolation()
@Controller('lesson-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ALL_TEACHER_ROLES)
export class LessonPlansController {
  constructor(private readonly service: LessonPlansService) {}

  private ctx(req: AuthRequest) {
    return { userId: req.user.id ?? req.user.sub!, schoolId: req.user.schoolId ?? null, role: req.user.role };
  }

  // ── static routes first (before :id) ────────────────────────────
  @Get('tools')
  getTools() {
    return this.service.getTools();
  }

  @Get('values/:month')
  getValue(@Param('month') month: string) {
    return this.service.getValueForMonth(month);
  }

  // ── list / create ───────────────────────────────────────────────
  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.list(this.ctx(req));
  }

  @Post()
  create(@Body() body: LessonHeaderDto, @Req() req: AuthRequest) {
    return this.service.createDraft(this.ctx(req), body as never);
  }

  // ── single lesson ───────────────────────────────────────────────
  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.getOne(id, this.ctx(req));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: LessonHeaderDto, @Req() req: AuthRequest) {
    return this.service.updateHeader(id, this.ctx(req), body as never);
  }

  // ── AI: objectives (Haiku) ──────────────────────────────────────
  @Post(':id/objectives')
  @UseGuards(SubscriptionGuard)
  objectives(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.service.generateObjectives(id, this.ctx(req));
  }

  // ── constructor: set stages ─────────────────────────────────────
  @Patch(':id/stages')
  setStages(@Param('id') id: string, @Body() body: SetStagesDto, @Req() req: AuthRequest) {
    return this.service.setStages(id, this.ctx(req), body.stages as never);
  }

  // ── AI: generate (async) ────────────────────────────────────────
  @Post(':id/generate')
  @UseGuards(SubscriptionGuard)
  generate(@Param('id') id: string, @Body() body: GenerateLessonDto, @Req() req: AuthRequest) {
    return this.service.startGeneration(id, this.ctx(req), body.mode);
  }

  // ── AI: regenerate one stage ────────────────────────────────────
  @Post(':id/stages/:sid/regenerate')
  @UseGuards(SubscriptionGuard)
  regenerate(@Param('id') id: string, @Param('sid') sid: string, @Req() req: AuthRequest) {
    return this.service.regenerateStage(id, sid, this.ctx(req));
  }

  // ── swap tool on a stage ────────────────────────────────────────
  @Patch(':id/stages/:sid/swap-tool')
  swapTool(@Param('id') id: string, @Param('sid') sid: string, @Body() body: SwapToolDto, @Req() req: AuthRequest) {
    return this.service.swapTool(id, sid, this.ctx(req), body.toolId);
  }

  // ── export (№130) → .docx ───────────────────────────────────────
  @Get(':id/export')
  async export(@Param('id') id: string, @Req() req: AuthRequest, @Res() res: Response) {
    const buf = await this.service.exportDocx(id, this.ctx(req));
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="ksp-${id}.docx"`,
    });
    res.send(buf);
  }
}
