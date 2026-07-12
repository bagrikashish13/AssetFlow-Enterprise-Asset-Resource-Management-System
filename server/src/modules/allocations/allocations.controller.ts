import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ReturnAllocationDto } from './dto/return-allocation.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('allocations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AllocationsController {
  constructor(private readonly allocationsService: AllocationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  allocate(
    @Body() createAllocationDto: CreateAllocationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.allocationsService.allocate(createAllocationDto, userId);
  }

  @Post(':id/return')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  returnAsset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() returnAllocationDto: ReturnAllocationDto,
  ) {
    return this.allocationsService.returnAsset(id, returnAllocationDto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  findAll(
    @Query()
    query: PaginationQueryDto & { assetId?: string; holderUserId?: string },
  ) {
    return this.allocationsService.findAll(query);
  }
}
