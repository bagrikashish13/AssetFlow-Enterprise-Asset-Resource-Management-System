import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export interface ActivityQuery extends PaginationQueryDto {
  actorId?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ActivityQuery, user: { id: string; role: UserRole }) {
    const {
      page = 1,
      limit = 20,
      actorId,
      entityType,
      action,
      from,
      to,
    } = query;
    const skip = (page - 1) * limit;

    // Admins and asset managers see all activity; everyone else sees their own.
    const orgWide =
      user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;

    const where: Prisma.ActivityLogWhereInput = {
      ...(orgWide ? {} : { actorId: user.id }),
      ...(orgWide && actorId ? { actorId } : {}),
      ...(entityType && { entityType }),
      ...(action && { action }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true } } },
      }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
