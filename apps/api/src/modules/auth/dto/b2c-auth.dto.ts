import { IsEmail, IsString, Length, MinLength } from "class-validator";

export class SendCodeDto {
  @IsEmail()
  email!: string;
}

export class VerifyCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class LoginB2CDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
