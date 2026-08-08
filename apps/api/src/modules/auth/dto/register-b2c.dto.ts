import { Equals, IsBoolean, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterB2CDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  region?: string;

  // ── Согласия ───────────────────────────────────────────────────────────────
  // Два раздельных согласия, каждое обязательно. Equals(true) означает, что
  // регистрация не пройдёт без явного true: проверка на сервере, а не только
  // блокировка кнопки на фронте — иначе её обходят прямым запросом к API.

  /** Сбор и обработка персональных данных + принятие политики и соглашения. */
  @IsBoolean()
  @Equals(true, { message: "CONSENT_PERSONAL_DATA_REQUIRED" })
  consentPersonalData!: boolean;

  /** Трансграничная передача содержания запросов для создания учебных материалов. */
  @IsBoolean()
  @Equals(true, { message: "CONSENT_CROSS_BORDER_REQUIRED" })
  consentCrossBorder!: boolean;
}
