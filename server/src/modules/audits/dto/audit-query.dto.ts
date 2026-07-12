import { IsOptional, IsEnum } from 'class-validator';
import { AuditCycleStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AuditCycleStatus)
  status?: AuditCycleStatus;
}
