import { HttpException, HttpStatus, Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KmzhGenerateDto } from './dto/kmzh-generate.dto';
import { KmzhSaveDto } from './dto/kmzh-save.dto';
import { KmzhStageCacheService } from './kmzh.cache.service';
import { KmzhSessionService } from './kmzh.session.service';
import { KmzhSaved } from './entities/kmzh-saved.entity';
import { ADAL_AZAMAT_VALUES } from './constants/adal-azamat.constants';
import { buildObjectivesPrompt } from './prompts/objectives.prompt';
import { buildStagesPrompt } from './prompts/stages.prompt';
import { TokenService } from '../tokens/token.service';
import { AiClientService } from '../../services/ai-client.service';
import { AiUsageService, UserContext } from '../ai-usage/ai-usage.service';
import { AI_MODELS } from '../../config/ai-models';

@Injectable()
export class KmzhService {
  private readonly logger = new Logger(KmzhService.name);

  constructor(
    private readonly cacheService: KmzhStageCacheService,
    private readonly sessionService: KmzhSessionService,
    private readonly tokenService: TokenService,
    private readonly aiClientService: AiClientService,
    @Optional() private readonly aiUsageService: AiUsageService,
    @InjectRepository(KmzhSaved)
    private readonly savedRepo: Repository<KmzhSaved>,
  ) {}

  private async checkLimit(userCtx: UserContext, actionType: string) {
    if (!this.aiUsageService?.isLimitedRole(userCtx.role)) return null;
    const check = await this.aiUsageService.checkAndIncrement(userCtx.userId, userCtx.schoolId, actionType);
    if (!check.allowed) {
      throw new HttpException({ message: check.message, limitReached: true }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return check;
  }

  private recordUsage(userCtx: UserContext, actionType: string, tokensIn: number, tokensOut: number) {
    if (!this.aiUsageService?.isLimitedRole(userCtx.role)) return;
    this.aiUsageService.recordTokens(userCtx.userId, userCtx.schoolId, actionType, tokensIn, tokensOut).catch(() => {});
  }

  async generate(dto: KmzhGenerateDto, userCtx: UserContext) {
    await this.checkLimit(userCtx, 'kmzh_generate');

    const sessionId = dto.sessionId || (await this.sessionService.createSession(userCtx.userId, userCtx.schoolId));
    const regenCount = await this.sessionService.getRegenCount(sessionId);

    const month = dto.valueMonth || new Date(dto.date).toISOString().slice(5, 7);
    const valueLink = ADAL_AZAMAT_VALUES[month]?.[dto.lang] || '';

    const lessonObjectives = await this.generateObjectives(dto, userCtx);
    const { stages, fromCache } = await this.generateStages(dto, lessonObjectives, userCtx);

    const totalMinutes = stages.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    const totalPoints = stages.reduce((sum: number, s: any) => sum + (s.totalPoints || 0), 0);

    return {
      header: { ...dto, valueLink },
      lessonObjectives,
      stages,
      meta: {
        sessionId,
        regenerationCount: regenCount,
        maxRegenerations: 3,
        fromCache,
        totalMinutes,
        totalPoints,
      },
    };
  }

  async regenerate(sessionId: string, dto: KmzhGenerateDto, userCtx: UserContext) {
    await this.checkLimit(userCtx, 'kmzh_generate');

    const regenCount = await this.sessionService.incrementRegen(sessionId);

    const month = dto.valueMonth || new Date(dto.date).toISOString().slice(5, 7);
    const valueLink = ADAL_AZAMAT_VALUES[month]?.[dto.lang] || '';

    const lessonObjectives = await this.generateObjectives(dto, userCtx);
    const { stages } = await this.generateStagesForced(dto, lessonObjectives, userCtx);

    const totalMinutes = stages.reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    const totalPoints = stages.reduce((sum: number, s: any) => sum + (s.totalPoints || 0), 0);

    return {
      header: { ...dto, valueLink },
      lessonObjectives,
      stages,
      meta: {
        sessionId,
        regenerationCount: regenCount,
        maxRegenerations: 3,
        fromCache: false,
        totalMinutes,
        totalPoints,
      },
    };
  }

  private async generateObjectives(dto: KmzhGenerateDto, userCtx: UserContext) {
    const prompt = buildObjectivesPrompt(
      dto.learningObjectives, dto.grade, dto.lessonTitle, dto.lang
    );

    const result = await this.aiClientService.request({
      action: 'kmzh_objectives',
      systemPrompt: '',
      messages: [{ role: 'user', content: prompt }],
    });

    this.recordUsage(userCtx, 'kmzh_objectives', result.tokensIn, result.tokensOut);

    await this.tokenService.deductTokens({
      schoolId: userCtx.schoolId,
      userId: userCtx.userId,
      inputTokens: result.tokensIn,
      outputTokens: result.tokensOut,
      actionType: 'kmzh_objectives',
      model: result.model,
      fromCache: false,
    }).catch(err => this.logger.warn('Token deduction failed: ' + err.message));

    try {
      return JSON.parse(result.content.trim());
    } catch (err) {
      this.logger.error('Failed to parse objectives JSON', err);
      throw new HttpException('Ошибка генерации целей урока. Попробуйте позже.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async generateStages(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userCtx: UserContext,
  ) {
    const cached = await this.cacheService.getCached(dto);
    if (cached) {
      await this.tokenService.deductTokens({
        schoolId: userCtx.schoolId,
        userId: userCtx.userId,
        inputTokens: 0,
        outputTokens: 0,
        actionType: 'kmzh_generate',
        model: 'cache_hit',
        fromCache: true,
      }).catch(() => {});
      return { stages: cached, fromCache: true };
    }

    const stages = await this.callSonnetForStages(dto, lessonObjectives, userCtx);
    await this.cacheService.saveCache(dto, stages);
    return { stages, fromCache: false };
  }

  private async generateStagesForced(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userCtx: UserContext,
  ) {
    const stages = await this.callSonnetForStages(dto, lessonObjectives, userCtx);
    await this.tokenService.deductTokens({
      schoolId: userCtx.schoolId,
      userId: userCtx.userId,
      inputTokens: 100,
      outputTokens: 100,
      actionType: 'kmzh_regen_penalty',
      model: AI_MODELS.SONNET,
      fromCache: false,
    }).catch(() => {});
    await this.cacheService.saveCache(dto, stages);
    return { stages };
  }

  private async callSonnetForStages(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userCtx: UserContext,
  ) {
    const prompt = buildStagesPrompt(
      dto.lang, dto.lessonTitle, dto.grade,
      dto.unitTopic, dto.learningObjectives, lessonObjectives
    );

    const result = await this.aiClientService.request({
      action: 'kmzh_generate',
      systemPrompt: 'Ты опытный учитель-методист казахстанской школы. Отвечай ТОЛЬКО валидным JSON, без markdown, без пояснений.',
      messages: [{ role: 'user', content: prompt }],
    });

    this.recordUsage(userCtx, 'kmzh_generate', result.tokensIn, result.tokensOut);

    await this.tokenService.deductTokens({
      schoolId: userCtx.schoolId,
      userId: userCtx.userId,
      inputTokens: result.tokensIn,
      outputTokens: result.tokensOut,
      actionType: 'kmzh_generate',
      model: result.model,
      fromCache: false,
    }).catch(err => this.logger.warn('Token deduction failed: ' + err.message));

    try {
      const cleaned = result.content.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error('Failed to parse stages JSON', err);
      throw new HttpException('Ошибка генерации этапов урока. Попробуйте позже.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async save(dto: KmzhSaveDto, userId: string, schoolId: string) {
    return this.savedRepo.save({
      userId,
      schoolId,
      classroomId: dto.classroomId,
      planJson: dto.planJson,
      lessonTitle: dto.lessonTitle,
      grade: dto.grade,
      date: dto.date,
    });
  }

  async getMySaved(userId: string, schoolId: string) {
    return this.savedRepo.find({
      where: { userId, schoolId },
      order: { createdAt: 'DESC' },
    });
  }

  getValuesByMonth(month: string) {
    return ADAL_AZAMAT_VALUES[month] || null;
  }
}
