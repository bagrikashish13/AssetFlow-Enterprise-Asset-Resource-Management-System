import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainEventsService } from '../events/domain-events.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
  ) {}

  /**
   * Persist a notification and push it to the recipient in realtime.
   * Accepts an optional transaction client so it can run inside a workflow.
   */
  async create(
    input: CreateNotificationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    const notification = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
    this.events.notify(input.userId, notification);
  }

  /** Fan a notification out to many recipients. */
  async createMany(
    inputs: CreateNotificationInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    for (const input of inputs) {
      await this.create(input, tx);
    }
  }

  async findAll(
    userId: string,
    query: PaginationQueryDto & { unread?: string },
  ) {
    const { page = 1, limit = 20, unread } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unread === 'true' && { isRead: false }),
    };

    const [total, data, unreadCount] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Notification not found',
      });
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }
}
