import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class KmzhGenerateDto {
  @IsIn(['kz', 'ru', 'en'])
  lang!: 'kz' | 'ru' | 'en';

  @IsString()
  unitTopic!: string;

  @IsString()
  lessonNumber!: string;

  @IsString()
  teacherName!: string;

  @IsString()
  date!: string;

  @IsString()
  grade!: string;

  @IsNumber()
  presentCount!: number;

  @IsNumber()
  absentCount!: number;

  @IsString()
  lessonTitle!: string;

  @IsString()
  learningObjectives!: string;

  @IsOptional()
  @IsString()
  valueMonth?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
