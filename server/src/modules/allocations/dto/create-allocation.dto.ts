import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  assetId!: string;

  @ValidateIf((o: CreateAllocationDto) => !o.holderDepartmentId)
  @IsUUID()
  holderUserId?: string;

  @ValidateIf((o: CreateAllocationDto) => !o.holderUserId)
  @IsUUID()
  holderDepartmentId?: string;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
