import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { KmzhGenerateDto } from './dto/kmzh-generate.dto';
import { KmzhSaveDto } from './dto/kmzh-save.dto';
import { KmzhCacheService } from './kmzh.cache.service';
import { KmzhSessionService } from './kmzh.session.service';
import { KmzhSaved } from './entities/kmzh-saved.entity';
import { ADAL_AZAMAT_VALUES } from './constants/adal-azamat.constants';
import { buildObjectivesPrompt } from './prompts/objectives.prompt';
import { buildStagesPrompt } from './prompts/stages.prompt';
import { TokenService } from '../tokens/token.service';

@Injectable()
export class KmzhService {
  private readonly logger = new Logger(KmzhService.name);
  private readonly anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  constructor(
    private readonly cacheService: KmzhCacheService,
    private readonly sessionService: KmzhSessionService,
    private readonly tokenService: TokenService,
    @InjectRepository(KmzhSaved)
    private readonly savedRepo: Repository<KmzhSaved>,
  ) {}

  async generate(dto: KmzhGenerateDto, userId: string, schoolId: string) {
    const sessionId = dto.sessionId || (await this.sessionService.createSession(userId, schoolId));
    const regenCount = await this.sessionService.getRegenCount(sessionId);

    const month = dto.valueMonth || new Date(dto.date).toISOString().slice(5, 7);
    const valueLink = ADAL_AZAMAT_VALUES[month]?.[dto.lang] || '';

    const lessonObjectives = await this.generateObjectives(dto, userId, schoolId);
    const { stages, fromCache } = await this.generateStages(dto, lessonObjectives, userId, schoolId);

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

  async regenerate(sessionId: string, dto: KmzhGenerateDto, userId: string, schoolId: string) {
    const regenCount = await this.sessionService.incrementRegen(sessionId);

    const month = dto.valueMonth || new Date(dto.date).toISOString().slice(5, 7);
    const valueLink = ADAL_AZAMAT_VALUES[month]?.[dto.lang] || '';

    const lessonObjectives = await this.generateObjectives(dto, userId, schoolId);
    const { stages } = await this.generateStagesForced(dto, lessonObjectives, userId, schoolId);

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

  private async generateObjectives(dto: KmzhGenerateDto, userId: string, schoolId: string) {
    const prompt = buildObjectivesPrompt(
      dto.learningObjectives, dto.grade, dto.lessonTitle, dto.lang
    );

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const usage = response.usage;

    await this.tokenService.deductTokens({
      schoolId, userId,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      actionType: 'kmzh_objectives',
      model: 'claude-haiku-4-5-20251001',
      fromCache: false,
    }).catch(err => this.logger.warn('Token deduction failed: ' + err.message));

    try {
      return JSON.parse(text.trim());
    } catch {
      return { all: '', most: '', some: '' };
    }
  }

  private async generateStages(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userId: string,
    schoolId: string,
  ) {
    const cached = await this.cacheService.getCached(dto);
    if (cached) {
      await this.tokenService.deductTokens({
        schoolId, userId,
        inputTokens: 0, outputTokens: 0,
        actionType: 'kmzh_generate',
        model: 'cache_hit',
        fromCache: true,
      }).catch(() => {});
      return { stages: cached, fromCache: true };
    }

    const stages = await this.callSonnetForStages(dto, lessonObjectives, userId, schoolId);
    await this.cacheService.saveCache(dto, stages);
    return { stages, fromCache: false };
  }

  private async generateStagesForced(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userId: string,
    schoolId: string,
  ) {
    const stages = await this.callSonnetForStages(dto, lessonObjectives, userId, schoolId);
    await this.tokenService.deductTokens({
      schoolId, userId,
      inputTokens: 100, outputTokens: 100,
      actionType: 'kmzh_regen_penalty',
      model: 'claude-sonnet-4-20250514',
      fromCache: false,
    }).catch(() => {});
    await this.cacheService.saveCache(dto, stages);
    return { stages };
  }

  private async callSonnetForStages(
    dto: KmzhGenerateDto,
    lessonObjectives: any,
    userId: string,
    schoolId: string,
  ) {
    const prompt = buildStagesPrompt(
      dto.lang, dto.lessonTitle, dto.grade,
      dto.unitTopic, dto.learningObjectives, lessonObjectives
    );

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: 'Ты опытный учитель-методист казахстанской школы. Отвечай ТОЛЬКО валидным JSON, без markdown, без пояснений.',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const usage = response.usage;

    await this.tokenService.deductTokens({
      schoolId, userId,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      actionType: 'kmzh_generate',
      model: 'claude-sonnet-4-20250514',
      fromCache: false,
    }).catch(err => this.logger.warn('Token deduction failed: ' + err.message));

    try {
      const cleaned = text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned);
    } catch {
      return [];
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
