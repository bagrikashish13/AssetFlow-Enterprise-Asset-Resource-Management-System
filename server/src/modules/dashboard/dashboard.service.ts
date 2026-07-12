import { Injectable } from '@nestjs/common';
import { AssetStatus, AllocationStatus, BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async kpis() {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns,
    ] = await Promise.all([
      this.prisma.asset.count({ where: { status: AssetStatus.AVAILABLE } }),
      this.prisma.asset.count({ where: { status: AssetStatus.ALLOCATED } }),
      this.prisma.maintenanceRequest.count({
        where: {
          status: { in: ['APPROVED', 'ASSIGNED', 'IN_PROGRESS'] },
        },
      }),
      this.prisma.booking.count({
        where: {
          status: BookingStatus.CONFIRMED,
          startAt: { lte: now },
          endAt: { gt: now },
        },
      }),
      this.prisma.transferRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.allocation.count({
        where: {
          status: AllocationStatus.ACTIVE,
          expectedReturnAt: { gte: now, lte: in7Days },
        },
      }),
      this.prisma.allocation.count({
        where: {
          status: AllocationStatus.ACTIVE,
          expectedReturnAt: { lt: now },
        },
      }),
    ]);

    return {
      assetsAvailable,
      assetsAllocated,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      overdueReturns,
    };
  }

  async overdue() {
    const now = new Date();
    const rows = await this.prisma.allocation.findMany({
      where: {
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { lt: now },
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        holderUser: { select: { id: true, name: true } },
        holderDepartment: { select: { id: true, name: true } },
      },
      orderBy: { expectedReturnAt: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      daysOverdue: Math.floor(
        (now.getTime() - (r.expectedReturnAt?.getTime() ?? now.getTime())) /
          (24 * 60 * 60 * 1000),
      ),
    }));
  }

  async upcomingReturns() {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.allocation.findMany({
      where: {
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { gte: now, lte: in7Days },
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        holderUser: { select: { id: true, name: true } },
        holderDepartment: { select: { id: true, name: true } },
      },
      orderBy: { expectedReturnAt: 'asc' },
    });
  }

  async todayBookings() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startAt: { gte: start, lte: end },
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        bookedBy: { select: { id: true, name: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }
}
