import { IsEmail, IsIn, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(["teacher", "class_teacher", "vice_principal", "principal", "student"])
  role!: string;

  @IsString()
  schoolName!: string;
}
