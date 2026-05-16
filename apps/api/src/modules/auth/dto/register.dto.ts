import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(["teacher", "class_teacher", "vice_principal", "vice_principal_academic", "vice_principal_education", "psychologist", "social_pedagogue", "principal", "student"])
  role!: string;

  @IsString()
  schoolName!: string;
}
