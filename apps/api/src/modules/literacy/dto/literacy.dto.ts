import {
  ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

const TYPES = ['reading', 'math', 'science'] as const;
const LANGS = ['ru', 'kz', 'en'] as const;
const Q_TYPES = ['single', 'multiple', 'truefalse', 'short', 'open', 'matching'];

export class CreateSetDto {
  @IsIn(TYPES) literacyType!: (typeof TYPES)[number];
  @IsOptional() @IsString() @MaxLength(100) subject?: string;
  @IsOptional() @IsInt() @Min(1) @Max(11) grade?: number;
  @IsOptional() @IsIn(LANGS) language?: (typeof LANGS)[number];
  @IsOptional() @IsIn(['own', 'generated']) sourceMode?: 'own' | 'generated';
  @IsOptional() @IsString() @MaxLength(500) sourceTopic?: string;
  @IsOptional() @IsString() @MaxLength(1000) sourceNotes?: string;
  @IsOptional() @IsInt() @Min(3) @Max(15) questionCount?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsInt({ each: true }) @Min(1, { each: true }) @Max(6, { each: true }) pisaLevels?: number[];
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(Q_TYPES, { each: true }) questionTypes?: string[];
}

export class SetStimulusDto {
  @IsIn(['own', 'generated']) mode!: 'own' | 'generated';
  @IsOptional() @IsString() @MaxLength(15000) text?: string;
}
