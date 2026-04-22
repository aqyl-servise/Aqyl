import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GenerateTaskSetDto {
  @IsString()
  topic!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsString()
  subject!: string;

  @IsString()
  language!: string;

  @IsIn(["exercise", "quiz", "test"])
  type!: "exercise" | "quiz" | "test";

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(15)
  questionCount?: number;
}
