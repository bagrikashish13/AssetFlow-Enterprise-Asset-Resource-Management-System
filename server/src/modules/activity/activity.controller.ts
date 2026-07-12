import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import type { ActivityQuery } from './activity.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@ApiTags('activity')
@Controller('activity-logs')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  findAll(
    @Query() query: ActivityQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activityService.findAll(query, user);
  }
}
