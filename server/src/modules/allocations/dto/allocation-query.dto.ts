import { IsOptional, IsUUID, IsEnum, IsBooleanString } from 'class-validator';
import { AllocationStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class AllocationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  holderUserId?: string;

  @IsOptional()
  @IsEnum(AllocationStatus)
  status?: AllocationStatus;

  @IsOptional()
  @IsBooleanString()
  overdue?: string;
}
