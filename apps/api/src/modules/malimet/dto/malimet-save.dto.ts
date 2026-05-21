import { IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MalimetFormDataDto } from './malimet-generate.dto';

export class MalimetSaveDto {
  @ValidateNested()
  @Type(() => MalimetFormDataDto)
  formData!: MalimetFormDataDto;

  @IsIn(['kz', 'ru'])
  lang!: 'kz' | 'ru';
}
