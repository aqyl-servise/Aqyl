import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import {
  GateViolation, checkKazakhStructure, describeGateViolations,
  hardViolations, softViolations,
} from './engine/language-gate';

/**
 * Единственная точка сохранения сгенерированного текста (ТЗ 1.6, п. 3.1).
 * Любой модуль перед записью текста в базу обязан пропустить его через
 * persistGeneratedText. Обход = архитектурная ошибка ревью.
 *
 * Поведение (п. 3.3): уровни 1 и 3 — жёсткая ошибка (LanguageGateError,
 * вызывающий цикл перегенерирует фрагмент, до 2 попыток); уровень 2 —
 * предупреждение. После исчерпания попыток вызывающий передаёт
 * allowFlag: true — текст сохраняется, урок помечается languageWarning
 * для ручного разбора (выборка: WHERE "languageWarning").
 */
export class LanguageGateError extends Error {
  constructor(public readonly violations: GateViolation[]) {
    super(`Языковой шлюз: ${describeGateViolations(violations)}`);
  }
}

export interface GateContext {
  lessonId: string;
  /** Модуль-источник: 'plan:stage', 'handout:individual', 'presentation', … */
  module: string;
  /** Язык урока — шлюз проверяет только 'kz'. */
  language: string | null | undefined;
  /**
   * true после исчерпания попыток перегенерации: жёсткие нарушения не
   * блокируют сохранение, а помечают урок.
   */
  allowFlag?: boolean;
}

@Injectable()
export class LanguageGateService {
  private readonly logger = new Logger(LanguageGateService.name);

  constructor(
    @InjectRepository(Lesson) private readonly lessonRepo: Repository<Lesson>,
  ) {}

  /** Проверка без побочных эффектов — для условий в циклах перегенерации. */
  check(value: unknown, language: string | null | undefined): GateViolation[] {
    if (language !== 'kz') return [];
    return checkKazakhStructure(value);
  }

  /**
   * Пропустить значение через шлюз перед сохранением. Возвращает значение
   * как есть; кидает LanguageGateError при жёстких нарушениях без allowFlag.
   */
  async persistGeneratedText<T>(value: T, ctx: GateContext): Promise<T> {
    const violations = this.check(value, ctx.language);
    if (!violations.length) return value;

    const hard = hardViolations(violations);
    const soft = softViolations(violations);
    // Лог всех срабатываний (п. 3.3): урок, модуль, уровень, слово, контекст.
    this.logger.warn(
      `Языковой шлюз: урок ${ctx.lessonId}, модуль ${ctx.module} — ${describeGateViolations(violations)}` +
      (ctx.allowFlag ? ' → сохранено с пометкой languageWarning' : ' → на перегенерацию'),
    );

    if (hard.length && !ctx.allowFlag) throw new LanguageGateError(hard);

    if (hard.length || soft.length) {
      await this.lessonRepo
        .update({ id: ctx.lessonId }, { languageWarning: true })
        .catch(() => {});
    }
    return value;
  }
}
