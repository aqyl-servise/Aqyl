import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class SaveAnalysisDto {
  @IsOptional()
  @IsString()
  visitPurpose?: string;

  @IsOptional()
  @IsString()
  lessonTopic?: string;

  @IsOptional()
  @IsString()
  lessonPurpose?: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsArray()
  studentSurveyTable?: unknown[];

  @IsOptional()
  @IsArray()
  lessonProgressTable?: unknown[];

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsString()
  teacherSignature?: string;

  @IsOptional()
  @IsDateString()
  teacherSignDate?: string;

  @IsOptional()
  @IsString()
  analyzerSignature?: string;

  @IsOptional()
  @IsDateString()
  analyzerSignDate?: string;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
