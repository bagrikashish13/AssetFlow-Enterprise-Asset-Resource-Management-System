import {
  IsUUID,
  IsString,
  Length,
  IsISO8601,
  IsOptional,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  @Length(3, 200)
  purpose!: string;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsUUID()
  forDepartmentId?: string;
}
