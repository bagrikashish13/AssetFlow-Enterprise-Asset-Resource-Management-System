import { IsString, Length, IsOptional, IsNumber, Min } from 'class-validator';

export class RejectMaintenanceDto {
  @IsString()
  @Length(3, 500)
  rejectionReason!: string;
}

export class AssignMaintenanceDto {
  @IsString()
  @Length(2, 120)
  technicianName!: string;
}

export class ResolveMaintenanceDto {
  @IsString()
  @Length(3, 2000)
  resolutionNotes!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
