import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { UserRole } from "../../teachers/entities/teacher.entity";

const ROLES: UserRole[] = [
  "teacher",
  "admin",
  "principal",
  "vice_principal",
  "vice_principal_academic",
  "vice_principal_education",
  "psychologist",
  "social_pedagogue",
  "class_teacher",
  "student",
];

// Whitelisted fields an admin / school leader may change on a staff account.
// Sensitive columns (passwordHash, status, subscriptionStatus, registrationSource,
// trialEndsAt, email, …) are intentionally NOT here, so the global ValidationPipe
// (whitelist + forbidNonWhitelisted) blocks mass-assignment attempts.
export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsIn(ROLES)
  role?: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

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
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  managedClassroomId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  managedClassroomName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolId?: string | null;
}
