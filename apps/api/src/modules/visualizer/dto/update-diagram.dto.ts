import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateDiagramDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsString()
  theme?: string;
}
