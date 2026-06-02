import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateAttestationDto {
  @IsOptional()
  @IsString()
  diplomaFileUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  categoryDate?: string;

  @IsOptional()
  @IsDateString()
  nextAttestationDate?: string;

  @IsOptional()
  @IsString()
  ozpResult?: string;

  @IsOptional()
  @IsString()
  ozpFileUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coursesFileUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  protocolsFileUrls?: string[];
}
