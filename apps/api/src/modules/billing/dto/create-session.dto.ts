import { IsIn, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Создание платёжной сессии. Новый путь — packageCode (пакеты уроков, ТЗ №3);
 * months оставлен на переходный период для старого фронта и будет удалён
 * вместе с витриной подписки. Должно быть задано ровно одно из полей —
 * проверяет контроллер.
 */
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  packageCode?: string;

  @IsOptional()
  @IsInt()
  @IsIn([1, 3, 6, 12])
  months?: number;
}
