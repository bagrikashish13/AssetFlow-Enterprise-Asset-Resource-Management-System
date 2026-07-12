import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  Min,
  IsBoolean,
  IsDateString,
  IsObject,
} from 'class-validator';
import { AssetCondition } from '@prisma/client';

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  acquisitionCost?: number;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsObject()
  customFieldValues?: Record<string, string | number>;

  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;

  // Asset status is intentionally NOT writable here — all status transitions
  // go through the state-machine endpoints (see docs/04-LLD.md §2.5).

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
