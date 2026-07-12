import { IsEnum } from 'class-validator';
import { RecordStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(RecordStatus)
  status!: RecordStatus;
}
