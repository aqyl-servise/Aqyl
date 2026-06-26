import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';

export class SaveDiagramDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsObject()
  content!: Record<string, any>;

  @IsOptional()
  @IsString()
  theme?: string = 'aqyl-blue';
}
