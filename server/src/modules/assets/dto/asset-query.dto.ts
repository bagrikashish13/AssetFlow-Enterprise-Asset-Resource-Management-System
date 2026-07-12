import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBooleanString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AssetStatus, AssetCondition } from '@prisma/client';

export class AssetQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBooleanString()
  isBookable?: string;
}
