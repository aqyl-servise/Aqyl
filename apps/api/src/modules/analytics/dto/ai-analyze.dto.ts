import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class AiAnalyzeDto {
  @IsOptional()
  @IsNumber()
  avgScore?: number;

  @IsOptional()
  @IsNumber()
  totalStudents?: number;

  @IsOptional()
  @IsNumber()
  totalClassrooms?: number;

  @IsOptional()
  @IsNumber()
  submissionRate?: number;

  @IsOptional()
  @IsArray()
  topStudents?: unknown[];

  @IsOptional()
  @IsArray()
  bottomStudents?: unknown[];

  @IsOptional()
  @IsArray()
  bySubject?: unknown[];

  @IsOptional()
  @IsArray()
  byClass?: unknown[];
}
