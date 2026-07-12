import { IsString, IsUUID, IsOptional, ValidateIf } from 'class-validator';

export class CreateTransferDto {
  @IsUUID()
  assetId!: string;

  @ValidateIf((o: CreateTransferDto) => !o.targetDepartmentId)
  @IsUUID()
  @IsOptional()
  targetUserId?: string;

  @ValidateIf((o: CreateTransferDto) => !o.targetUserId)
  @IsUUID()
  @IsOptional()
  targetDepartmentId?: string;

  @IsString()
  reason!: string;
}
