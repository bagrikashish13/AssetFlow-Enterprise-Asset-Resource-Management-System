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
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { DecisionTransferDto } from './dto/decision-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  create(
    @Body() createTransferDto: CreateTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.create(createTransferDto, userId);
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.approve(id, userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisionTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.reject(id, dto, userId);
  }

  @Post(':id/cancel')
  @Roles(
    UserRole.ADMIN,
    UserRole.ASSET_MANAGER,
    UserRole.DEPT_HEAD,
    UserRole.EMPLOYEE,
  )
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.transfersService.cancel(id, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_HEAD)
  findAll(@Query() query: TransferQueryDto) {
    return this.transfersService.findAll(query);
  }
}
