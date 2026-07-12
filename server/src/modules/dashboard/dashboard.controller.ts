import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  kpis() {
    return this.dashboardService.kpis();
  }

  @Get('overdue')
  overdue() {
    return this.dashboardService.overdue();
  }

  @Get('upcoming-returns')
  upcomingReturns() {
    return this.dashboardService.upcomingReturns();
  }

  @Get('today-bookings')
  todayBookings() {
    return this.dashboardService.todayBookings();
  }
}
