import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class MaintenanceQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsEnum(MaintenancePriority)
  priority?: MaintenancePriority;
}
