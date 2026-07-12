import { IsOptional, IsBooleanString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBooleanString()
  unread?: string;
}
