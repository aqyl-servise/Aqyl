import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

const STAGE_TYPES = ['warmup', 'explanation', 'task', 'quiz', 'reflection'] as const;

export class StageItemDto {
  @IsIn(STAGE_TYPES) stageType!: (typeof STAGE_TYPES)[number];
  @IsOptional() @IsString() toolId?: string;
  @IsInt() @Min(0) @Max(60) timeMinutes!: number;
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
