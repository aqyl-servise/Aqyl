import { IsString, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class GenerateDiagramDto {
  @IsString()
  @IsNotEmpty()
  topicOrText!: string;

  @IsOptional()
  @IsString()
  @IsIn(['process', 'mindmap', 'timeline', 'cycle', 'hierarchy', 'comparison'])
  type?: string;

  @IsString()
  @IsIn(['kz', 'ru'])
  language!: 'kz' | 'ru';
}
