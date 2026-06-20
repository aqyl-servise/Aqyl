import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateB2CProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  gradeLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  language?: string;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
