import { IsString, IsNumber, IsArray, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StudentRefDto {
  @IsString()
  id!: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  gender?: string;
}

export class StudentGroupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentRefDto)
  students!: StudentRefDto[];

  @IsNumber()
  girlCount!: number;
}

export class MalimetFormDataDto {
  @IsString()
  classroomId!: string;

  @IsString()
  classroomName!: string;

  @IsIn([1, 2, 3, 4])
  quarter!: number;

  @IsString()
  academicYear!: string;

  @IsString()
  teacherFullName!: string;

  @IsNumber()
  startCount!: number;

  @IsNumber()
  startGirlCount!: number;

  @IsNumber()
  arrivedCount!: number;

  @IsOptional()
  @IsString()
  arrivedFrom?: string;

  @IsNumber()
  leftCount!: number;

  @IsOptional()
  @IsString()
  leftTo?: string;

  @IsNumber()
  endCount!: number;

  @IsNumber()
  endGirlCount!: number;

  @ValidateNested()
  @Type(() => StudentGroupDto)
  excellent!: StudentGroupDto;

  @ValidateNested()
  @Type(() => StudentGroupDto)
  good!: StudentGroupDto;

  @ValidateNested()
  @Type(() => StudentGroupDto)
  failing!: StudentGroupDto;
}

export class MalimetGenerateDto {
  @ValidateNested()
  @Type(() => MalimetFormDataDto)
  formData!: MalimetFormDataDto;

  @IsIn(['pdf', 'word'])
  format!: 'pdf' | 'word';

  @IsIn(['kz', 'ru'])
  lang!: 'kz' | 'ru';
}
