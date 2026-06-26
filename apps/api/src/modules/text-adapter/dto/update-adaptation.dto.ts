import { IsObject, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateAdaptationDto {
  @IsOptional()
  @IsObject()
  result?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['kz', 'ru'])
  language?: 'kz' | 'ru';
}
