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
import { AssetCondition, AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsString()
  name!: string;

  @IsUUID()
  categoryId!: string;

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
  customFieldValues?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isBookable?: boolean;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
