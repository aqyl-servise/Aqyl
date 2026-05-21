import { IsString, IsBoolean } from 'class-validator';
import { KmzhGenerateDto } from './kmzh-generate.dto';
import { Type } from 'class-transformer';

export class KmzhRegenerateDto {
  @IsString()
  sessionId!: string;

  @Type(() => KmzhGenerateDto)
  kmzhInput!: KmzhGenerateDto;

  @IsBoolean()
  bypassCache!: boolean;
}
