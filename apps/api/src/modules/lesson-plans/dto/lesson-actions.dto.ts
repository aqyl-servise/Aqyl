import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

const STAGE_TYPES = ['warmup', 'explanation', 'task', 'quiz', 'reflection'] as const;

export class StageItemDto {
  @IsIn(STAGE_TYPES) stageType!: (typeof STAGE_TYPES)[number];
  @IsOptional() @IsString() toolId?: string;
  // Время задаётся учителем или распределяется кодом между заданиями этапа.
  // 0 = «распредели сам»: пустое поле не должно валить валидацию.
  @IsInt() @Min(0) @Max(60) timeMinutes!: number;
  // Оцениваемость выбирает учитель (срез 2). Опустишь — сервер подставит
  // значение по типу этапа (task/quiz → true), чтобы старый фронт не сломался.
  @IsOptional() @IsBoolean() isAssessed?: boolean;
  // Привязка задания к ценности месяца (срез 2).
  @IsOptional() @IsBoolean() linkedToValue?: boolean;
}

export class SetStagesDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => StageItemDto)
  stages!: StageItemDto[];
}

export class GenerateLessonDto {
  @IsIn(['quick', 'constructor']) mode!: 'quick' | 'constructor';
}

export class SwapToolDto {
  @IsString() toolId!: string;
}
