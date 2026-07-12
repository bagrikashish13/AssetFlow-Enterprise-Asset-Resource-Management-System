import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import {
  RejectMaintenanceDto,
  AssignMaintenanceDto,
  ResolveMaintenanceDto,
} from './dto/maintenance-actions.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  raise(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenanceService.raise(dto, user);
  }

  @Get()
  findAll(@Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.approve(id, userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMaintenanceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.maintenanceService.reject(id, dto, userId);
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignMaintenanceDto,
  ) {
    return this.maintenanceService.assign(id, dto);
  }

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.start(id);
  }

  @Post(':id/resolve')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveMaintenanceDto,
  ) {
    return this.maintenanceService.resolve(id, dto);
  }
}
