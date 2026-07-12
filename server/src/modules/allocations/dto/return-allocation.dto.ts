import { IsString, IsOptional, IsEnum } from 'class-validator';
import { AssetCondition } from '@prisma/client';

export class ReturnAllocationDto {
  @IsOptional()
  @IsEnum(AssetCondition)
  returnCondition?: AssetCondition;

  @IsOptional()
  @IsString()
  returnNotes?: string;
}
