import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Adaptation } from './entities/adaptation.entity';
import { AdaptTextDto } from './dto/adapt-text.dto';
import { SaveAdaptationDto } from './dto/save-adaptation.dto';
import { UpdateAdaptationDto } from './dto/update-adaptation.dto';
import { AiClientService } from '../../services/ai-client.service';

const MAX_SOURCE_LENGTH = 8000;

@Injectable()
export class TextAdapterService {
  private readonly logger = new Logger(TextAdapterService.name);

  constructor(
    private readonly aiClientService: AiClientService,
    @InjectRepository(Adaptation)
    private readonly adaptationRepo: Repository<Adaptation>,
  ) {}

  /** Strip ```json / ``` fences and parse, throwing 422 on failure. */
  private parseJsonOrThrow(raw: string): Record<string, any> {
    const cleaned = raw
      .trim()
      .replace(/^```json?\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      this.logger.error('Failed to parse adaptation JSON', err as Error);
      throw new HttpException(
        'Ошибка генерации, попробуйте ещё раз',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async extractPdf(buffer: Buffer): Promise<{ text: string; pages: number; truncated?: boolean }> {
    let text: string;
    let pages: number;
    try {
      // pdf-parse v2 exposes a PDFParse class. Cast the require result so type
      // resolution doesn't fall back to the stale @types/pdf-parse (v1) shape.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PDFParse } = require('pdf-parse') as {
        PDFParse: new (opts: { data: Buffer }) => {
          getText: () => Promise<{ text: string; total: number }>;
          destroy: () => Promise<void>;
        };
      };
      const parser = new PDFParse({ data: buffer });
      try {
        const res = await parser.getText();
        text = (res.text ?? '').trim();
        pages = res.total ?? 0;
      } finally {
        await parser.destroy().catch(() => {});
      }
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error('PDF parsing failed', err as Error);
      throw new HttpException(
        'Не удалось прочитать PDF. Попробуйте другой файл.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (text.length < 50) {
      throw new HttpException(
        'В этом PDF нет текстового слоя. Вставьте текст вручную.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (text.length > MAX_SOURCE_LENGTH) {
      return { text: text.slice(0, MAX_SOURCE_LENGTH), pages, truncated: true };
    }

    return { text, pages };
  }

  async adapt(dto: AdaptTextDto, _userId: string, _schoolId?: string | null) {
    if (dto.sourceText.length > MAX_SOURCE_LENGTH) {
      throw new BadRequestException(
        'Текст слишком длинный. Сократите до 8000 символов.',
      );
    }

    const langLabel = dto.language === 'kz' ? 'kz' : 'ru';

    const systemPrompt =
      'Ты помогаешь казахстанским учителям адаптировать учебные тексты.\n' +
      'Адаптируй текст под уровень класса РК:\n' +
      '- Классы 1-4: простые короткие слова и предложения, конкретные образы\n' +
      '- Классы 5-9: средняя сложность, вводи термины с объяснением\n' +
      '- Классы 10-11: сложные конструкции, абстракция, аналитические вопросы\n\n' +
      `Язык вывода: ${langLabel}. Для kz — корректный казахский язык.\n\n` +
      'Отвечай СТРОГО JSON без преамбулы и без markdown-ограждений.\n' +
      'Структура ответа:\n' +
      '{\n' +
      '  adaptedText: string,\n' +
      '  summary: string (2-3 предложения),\n' +
      "  questions: [{ q: string, type: 'recall'|'inference' }] (4-6 вопросов),\n" +
      '  vocabulary: [{ term: string, definition: string }] (5-10 терминов)\n' +
      '}\n\n' +
      'Для классов 1-6: вопросы преимущественно recall.\n' +
      'Для классов 7-11: добавляй inference вопросы.';

    const userPrompt = `Класс: ${dto.targetGrade}. Текст: ${dto.sourceText}`;

    const result = await this.aiClientService.request({
      action: 'text_adapter_generate',
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return this.parseJsonOrThrow(result.content);
  }

  async translate(
    resultObj: Record<string, any>,
    fromLang: string,
    toLang: string,
    _userId: string,
  ) {
    const systemPrompt =
      `Переведи значения всех полей этой JSON-структуры с ${fromLang} на ${toLang}.\n` +
      'Сохрани структуру и ключи JSON без изменений. Переводи только значения.\n' +
      'Отвечай СТРОГО JSON без преамбулы и без markdown-ограждений.';

    const userPrompt = `Структура: ${JSON.stringify(resultObj)}`;

    const result = await this.aiClientService.request({
      action: 'text_adapter_translate',
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return this.parseJsonOrThrow(result.content);
  }

  async save(dto: SaveAdaptationDto, userId: string, schoolId?: string | null) {
    const adaptation = this.adaptationRepo.create({
      userId,
      schoolId: schoolId ?? null,
      sourceType: dto.sourceType,
      sourceText: dto.sourceText,
      targetGrade: dto.targetGrade,
      language: dto.language,
      result: dto.result,
    });
    return this.adaptationRepo.save(adaptation);
  }

  // Filter by userId only — B2C teachers without a school must see their own.
  async findAll(userId: string) {
    return this.adaptationRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string) {
    const adaptation = await this.adaptationRepo.findOne({
      where: { id, userId },
    });
    if (!adaptation) {
      throw new HttpException('Адаптация не найдена', HttpStatus.NOT_FOUND);
    }
    return adaptation;
  }

  async update(id: string, dto: UpdateAdaptationDto, userId: string) {
    const adaptation = await this.findOne(id, userId);
    if (dto.result !== undefined) adaptation.result = dto.result;
    if (dto.language !== undefined) adaptation.language = dto.language;
    return this.adaptationRepo.save(adaptation);
  }

  async remove(id: string, userId: string) {
    const adaptation = await this.findOne(id, userId);
    await this.adaptationRepo.remove(adaptation);
    return { success: true };
  }
}
