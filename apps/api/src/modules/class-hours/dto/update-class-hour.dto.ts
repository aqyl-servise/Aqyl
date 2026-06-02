import { IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateClassHourDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsIn(['education', 'law', 'circle', 'apko', 'other'])
  topic?: 'education' | 'law' | 'circle' | 'apko' | 'other';

  @IsOptional()
  @IsIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  dayOfWeek?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsIn(['planned', 'conducted', 'rescheduled'])
  status?: 'planned' | 'conducted' | 'rescheduled';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUrls?: string[];

  @IsOptional()
  @IsString()
  changeDescription?: string;
}
