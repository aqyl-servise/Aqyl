import { IsObject, IsString } from "class-validator";

export class ExportPdfDto {
  @IsString()
  title!: string;

  @IsString()
  type!: string;

  @IsString()
  language!: string;

  @IsObject()
  data!: Record<string, unknown>;
}
