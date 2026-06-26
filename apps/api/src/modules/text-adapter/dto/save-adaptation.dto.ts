import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsIn,
  IsObject,
} from 'class-validator';

export class SaveAdaptationDto {
  @IsString()
  @IsNotEmpty()
  sourceText!: string;

  @IsString()
  @IsIn(['text', 'pdf'])
  sourceType!: 'text' | 'pdf';

  @IsInt()
  @Min(1)
  @Max(11)
  targetGrade!: number;

  @IsString()
  @IsIn(['kz', 'ru'])
  language!: 'kz' | 'ru';

  @IsObject()
  result!: Record<string, any>;
}
