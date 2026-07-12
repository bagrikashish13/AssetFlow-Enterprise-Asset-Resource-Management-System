import { IsUUID, IsString, Length, IsEnum, IsOptional } from 'class-validator';
import { MaintenancePriority } from '@prisma/client';

export class CreateMaintenanceDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  @Length(3, 160)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @IsEnum(MaintenancePriority)
  priority!: MaintenancePriority;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
