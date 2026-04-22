import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateLessonPlanDto {
  @IsString()
  topic!: string;

  @IsString()
  subject!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsString()
  language!: string;

  @IsOptional()
  @IsString()
  objectives?: string;

  @IsInt()
  @Min(20)
  @Max(120)
  duration!: number;
}
