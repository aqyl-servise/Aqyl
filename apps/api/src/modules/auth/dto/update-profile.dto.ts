import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from "class-validator";

// Whitelisted self-service profile fields for staff (B2G) accounts.
// Using a validated DTO ensures the global ValidationPipe (whitelist +
// forbidNonWhitelisted) strips/rejects sensitive columns such as role,
// status, schoolId and passwordHash — preventing mass-assignment.
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  experience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  university?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  courses?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  achievements?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  preferredLanguage?: string;
}
