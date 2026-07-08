import {
  IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

// Lesson header (Экран 1). All fields optional — a draft can be created empty
// and filled progressively; validation guards types/lengths against injection.
export class LessonHeaderDto {
  @IsOptional() @IsString() @MaxLength(200) unit?: string;
  @IsOptional() @IsString() @MaxLength(150) teacherName?: string;
  @IsOptional() @IsString() @MaxLength(30) date?: string;
  @IsOptional() @IsString() @MaxLength(30) lessonNumber?: string;
  @IsOptional() @IsInt() @Min(1) @Max(11) grade?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) presentCount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) absentCount?: number;
  @IsOptional() @IsString() @MaxLength(100) subject?: string;
  @IsOptional() @IsString() @MaxLength(300) lessonTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) languageFocus?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) learningObjectives?: string[];
  @IsOptional() @IsString() @MaxLength(2) valueMonth?: string;
  @IsOptional() @IsInt() @Min(5) @Max(120) durationMinutes?: number;
}
