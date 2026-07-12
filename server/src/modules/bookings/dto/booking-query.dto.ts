import {
  IsOptional,
  IsUUID,
  IsISO8601,
  IsEnum,
  IsBooleanString,
} from 'class-validator';
import { BookingStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class BookingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsBooleanString()
  mine?: string;
}

export class AvailabilityQueryDto {
  @IsUUID()
  assetId!: string;

  @IsISO8601()
  from!: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  durationMinutes?: string;
}
