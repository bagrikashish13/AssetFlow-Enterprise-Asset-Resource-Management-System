import {
  IsString,
  Length,
  IsOptional,
  IsUUID,
  IsISO8601,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';

export class CreateAuditDto {
  @IsString()
  @Length(3, 160)
  name!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  location?: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  auditorIds!: string[];
}
