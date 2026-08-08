import { IsEmail, IsString, Length, MinLength } from "class-validator";

/** Точка 1 — удаление из профиля: единственное подтверждение — пароль. */
export class DeleteAccountByPasswordDto {
  @IsString()
  @MinLength(1)
  password!: string;
}

/** Точка 2, шаг 1 — публичная страница: выслать код на почту. */
export class DeleteAccountRequestCodeDto {
  @IsEmail()
  email!: string;
}

/** Точка 2, шаг 2 — подтверждение кодом. Пароль и вход не требуются. */
export class DeleteAccountConfirmDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
