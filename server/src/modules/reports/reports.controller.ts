import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { toCsv } from '../../common/utils/csv';

@ApiTags('reports')
@Controller('reports')
@Roles(UserRole.ADMIN, UserRole.ASSET_MANAGER, UserRole.DEPT_HEAD)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('status-distribution')
  statusDistribution(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.statusDistribution(),
      format,
      'status-distribution',
    );
  }

  @Get('utilization')
  utilization(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.utilization(),
      format,
      'utilization',
    );
  }

  @Get('idle-assets')
  idleAssets(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.idleAssets(),
      format,
      'idle-assets',
    );
  }

  @Get('maintenance-frequency')
  maintenanceFrequency(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.maintenanceFrequency(),
      format,
      'maintenance-frequency',
    );
  }

  @Get('maintenance-cost-trend')
  maintenanceCostTrend(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.maintenanceCostTrend(),
      format,
      'maintenance-cost-trend',
    );
  }

  @Get('department-allocation')
  departmentAllocation(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.departmentAllocation(),
      format,
      'department-allocation',
    );
  }

  @Get('booking-heatmap')
  bookingHeatmap(
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      this.reportsService.bookingHeatmap(),
      format,
      'booking-heatmap',
    );
  }

  @Get('health-distribution')
  healthDistribution() {
    // Object-shaped report (distribution + at-risk list); JSON only.
    return this.reportsService.healthDistribution();
  }

  private async respond(
    res: Response,
    dataPromise: Promise<unknown>,
    format: string,
    filename: string,
  ): Promise<unknown> {
    const data = (await dataPromise) as Record<string, unknown>[];
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      return toCsv(data);
    }
    return data;
  }
}
