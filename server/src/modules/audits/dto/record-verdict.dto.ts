import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { AuditResult } from '@prisma/client';

export class RecordVerdictDto {
  @IsEnum(AuditResult)
  result!: AuditResult;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}
