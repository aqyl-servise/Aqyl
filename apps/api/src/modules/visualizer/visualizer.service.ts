import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Diagram, DiagramType } from './entities/diagram.entity';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { SaveDiagramDto } from './dto/save-diagram.dto';
import { UpdateDiagramDto } from './dto/update-diagram.dto';
import { AiClientService } from '../../services/ai-client.service';

interface UserContext {
  userId: string;
  schoolId: string | null;
  role?: string;
}

const DIAGRAM_TYPES: DiagramType[] = [
  'process',
  'mindmap',
  'timeline',
  'cycle',
  'hierarchy',
  'comparison',
];

@Injectable()
export class VisualizerService {
  private readonly logger = new Logger(VisualizerService.name);

  constructor(
    private readonly aiClientService: AiClientService,
    @InjectRepository(Diagram)
    private readonly diagramRepo: Repository<Diagram>,
  ) {}

  /**
   * Two-call generation pipeline:
   *  - If `type` is provided, skip Haiku and use it directly.
   *  - If `type` is absent, Haiku classifies the input into one of 6 types.
   *  - Sonnet then generates the JSON contract.
   */
  async generateDiagram(dto: GenerateDiagramDto, _userCtx: UserContext) {
    const type = dto.type
      ? (dto.type as DiagramType)
      : await this.classifyType(dto.topicOrText);

    const contract = await this.generateContract(type, dto);
    return contract;
  }

  private async classifyType(topicOrText: string): Promise<DiagramType> {
    const systemPrompt =
      'Ты классифицируешь учебную тему/текст в один из 6 типов схемы. ' +
      'Доступные типы: process, mindmap, timeline, cycle, hierarchy, comparison. ' +
      'Ответь СТРОГО одним словом — названием типа, без пояснений и знаков препинания.';

    const result = await this.aiClientService.request({
      action: 'visualizer_classify',
      systemPrompt,
      messages: [{ role: 'user', content: topicOrText }],
    });

    const raw = result.content.trim().toLowerCase();
    const matched = DIAGRAM_TYPES.find(t => raw.includes(t));
    return matched ?? 'mindmap';
  }

  private async generateContract(type: DiagramType, dto: GenerateDiagramDto) {
    const langLabel = dto.language === 'kz' ? 'kz' : 'ru';

    const systemPrompt =
      'Ты генерируешь учебные схемы для казахстанских школьных учителей.\n' +
      'Отвечай СТРОГО JSON без преамбулы и без markdown-ограждений.\n' +
      `Язык label узлов: ${langLabel}.\n` +
      'Структура ответа:\n' +
      "{ type, title, language, nodes: [{id, label}], edges: [{from, to, label}], theme: 'aqyl-blue' }\n" +
      'Ограничения: process/cycle/hierarchy/comparison: 4-10 узлов, ' +
      'mindmap: корень + 3-6 ветвей по 2-4 подузла, timeline: 4-8 событий.';

    const userPrompt =
      `Тип схемы: ${type}\n` +
      `Язык: ${dto.language}\n` +
      `Тема или текст: ${dto.topicOrText}`;

    const result = await this.aiClientService.request({
      action: 'visualizer_generate',
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let cleaned = result.content.trim();
    // Strip ```json / ``` fences if present.
    cleaned = cleaned
      .replace(/^```json?\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      // Ensure consistent metadata.
      parsed.type = parsed.type || type;
      parsed.language = parsed.language || dto.language;
      parsed.theme = parsed.theme || 'aqyl-blue';
      return parsed;
    } catch (err) {
      this.logger.error('Failed to parse diagram JSON from Sonnet', err as Error);
      throw new HttpException(
        'Не удалось сгенерировать схему. Попробуйте переформулировать запрос.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async save(dto: SaveDiagramDto, userCtx: UserContext) {
    const content = dto.content ?? {};
    const type = (content as any).type as DiagramType;
    const language = (content as any).language;

    const diagram = this.diagramRepo.create({
      schoolId: userCtx.schoolId,
      userId: userCtx.userId,
      title: dto.title,
      type: DIAGRAM_TYPES.includes(type) ? type : 'mindmap',
      language: language === 'kz' ? 'kz' : 'ru',
      content,
      theme: dto.theme || 'aqyl-blue',
    });

    return this.diagramRepo.save(diagram);
  }

  async findAll(userCtx: UserContext) {
    return this.diagramRepo.find({
      where: { userId: userCtx.userId, schoolId: userCtx.schoolId ?? IsNull() },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userCtx: UserContext) {
    const diagram = await this.diagramRepo.findOne({
      where: { id, userId: userCtx.userId, schoolId: userCtx.schoolId ?? IsNull() },
    });
    if (!diagram) {
      throw new HttpException('Схема не найдена', HttpStatus.NOT_FOUND);
    }
    return diagram;
  }

  async update(id: string, dto: UpdateDiagramDto, userCtx: UserContext) {
    const diagram = await this.findOne(id, userCtx);

    if (dto.title !== undefined) diagram.title = dto.title;
    if (dto.content !== undefined) {
      diagram.content = dto.content;
      const type = (dto.content as any).type as DiagramType;
      const language = (dto.content as any).language;
      if (DIAGRAM_TYPES.includes(type)) diagram.type = type;
      if (language === 'kz' || language === 'ru') diagram.language = language;
    }
    if (dto.theme !== undefined) diagram.theme = dto.theme;

    return this.diagramRepo.save(diagram);
  }

  async remove(id: string, userCtx: UserContext) {
    const diagram = await this.findOne(id, userCtx);
    await this.diagramRepo.remove(diagram);
    return { success: true };
  }
}
