import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class AdaptTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000, { message: 'Текст слишком длинный. Сократите до 8000 символов.' })
  sourceText!: string;

  @IsInt()
  @Min(1)
  @Max(11)
  targetGrade!: number;

  @IsString()
  @IsIn(['kz', 'ru'])
  language!: 'kz' | 'ru';

  @IsOptional()
  @IsString()
  @IsIn(['text', 'pdf'])
  sourceType?: 'text' | 'pdf' = 'text';
}
