import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AllocationStatus, BookingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEventsService } from '../events/domain-events.service';
import { NOTIFICATION_TEMPLATES } from '../../common/constants/notification-templates';

/**
 * Background jobs that surface time-based facts. Reservation status flips are
 * intentionally not automated here — booking phase is derived at read time, so
 * a cron mutating asset status would risk clobbering allocation state.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: DomainEventsService,
  ) {}

  /** Flag allocations past their expected return date, once per day each. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scanOverdueAllocations(): Promise<void> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.allocation.findMany({
      where: {
        status: AllocationStatus.ACTIVE,
        expectedReturnAt: { lt: now },
        holderUserId: { not: null },
      },
      include: { asset: { select: { name: true, assetTag: true } } },
    });

    let notified = 0;
    for (const alloc of overdue) {
      if (!alloc.holderUserId) continue;

      // Skip if we already notified for this allocation today.
      const already = await this.prisma.notification.findFirst({
        where: {
          userId: alloc.holderUserId,
          type: 'RETURN_OVERDUE',
          entityId: alloc.id,
          createdAt: { gte: startOfDay },
        },
      });
      if (already) continue;

      const tpl = NOTIFICATION_TEMPLATES.RETURN_OVERDUE;
      const params = {
        assetName: alloc.asset.name,
        assetTag: alloc.asset.assetTag,
        date: alloc.expectedReturnAt?.toDateString() ?? '',
      };
      await this.notifications.create({
        userId: alloc.holderUserId,
        type: 'RETURN_OVERDUE',
        title: tpl.title(params),
        body: tpl.body(params),
        entityType: 'allocation',
        entityId: alloc.id,
      });
      notified += 1;
    }

    if (notified > 0) {
      this.events.invalidate(['dashboard', 'allocations']);
      this.logger.log(`Overdue scan: sent ${notified} reminder(s).`);
    }
  }

  /** Remind bookers 15 minutes before an upcoming booking starts. */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendBookingReminders(): Promise<void> {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);

    const upcoming = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        reminderSentAt: null,
        startAt: { gt: now, lte: soon },
      },
      include: { asset: { select: { name: true, assetTag: true } } },
    });

    for (const booking of upcoming) {
      const tpl = NOTIFICATION_TEMPLATES.BOOKING_REMINDER;
      const params = {
        assetName: booking.asset.name,
        assetTag: booking.asset.assetTag,
        time: booking.startAt.toISOString(),
      };
      await this.notifications.create({
        userId: booking.bookedById,
        type: 'BOOKING_REMINDER',
        title: tpl.title(params),
        body: tpl.body(params),
        entityType: 'booking',
        entityId: booking.id,
      });
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSentAt: new Date() },
      });
    }
  }
}
