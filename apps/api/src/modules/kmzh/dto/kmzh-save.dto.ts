import { IsString, IsOptional } from 'class-validator';

export class KmzhSaveDto {
  @IsString()
  planJson!: string;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsString()
  lessonTitle?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
