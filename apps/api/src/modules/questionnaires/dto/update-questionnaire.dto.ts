import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateQuestionnaireDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsIn(['draft', 'assigned', 'completed'])
  status?: 'draft' | 'assigned' | 'completed';

  @IsOptional()
  @IsIn(['uploaded', 'ai_generated'])
  type?: 'uploaded' | 'ai_generated';
}
