import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditCycleStatus, UserRole } from '@prisma/client';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { RecordVerdictDto } from './dto/record-verdict.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-request';

@ApiTags('audits')
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAuditDto, @CurrentUser('id') userId: string) {
    return this.auditsService.create(dto, userId);
  }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto & { status?: AuditCycleStatus },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditsService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditsService.findOne(id);
  }

  @Get(':id/records')
  records(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditsService.records(id);
  }

  @Get(':id/discrepancies')
  discrepancies(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditsService.discrepancies(id);
  }

  @Patch(':id/records/:recordId')
  recordVerdict(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: RecordVerdictDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditsService.recordVerdict(id, recordId, dto, user);
  }

  @Post(':id/close')
  @Roles(UserRole.ADMIN)
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditsService.close(id);
  }
}
