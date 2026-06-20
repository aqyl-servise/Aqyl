import { IsIn, IsInt } from "class-validator";

export class CreateSessionDto {
  @IsInt()
  @IsIn([1, 3, 6, 12])
  months!: number;
}
