import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  MaintenanceStatus,
  AllocationStatus,
  AssetStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetStateMachine } from '../assets/asset-state.machine';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEventsService } from '../events/domain-events.service';
import { NOTIFICATION_TEMPLATES } from '../../common/constants/notification-templates';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import {
  RejectMaintenanceDto,
  AssignMaintenanceDto,
  ResolveMaintenanceDto,
} from './dto/maintenance-actions.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AssetStateMachine,
    private readonly notifications: NotificationsService,
    private readonly events: DomainEventsService,
  ) {}

  /** Notify the raiser about a decision and hint clients to refetch. */
  private async announce(
    req: { id: string; assetId: string; raisedById: string; title: string },
    type: 'MAINTENANCE_APPROVED' | 'MAINTENANCE_REJECTED',
    status: string,
    extra?: Record<string, string>,
  ): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: req.assetId },
      select: { name: true, assetTag: true },
    });
    const tpl = NOTIFICATION_TEMPLATES[type];
    const params = {
      assetName: asset?.name ?? 'Asset',
      assetTag: asset?.assetTag ?? '',
      ...extra,
    };
    await this.notifications.create({
      userId: req.raisedById,
      type,
      title: tpl.title(params),
      body: tpl.body(params),
      entityType: 'maintenance',
      entityId: req.id,
    });
    this.events.maintenanceUpdated(req.id, status, req.assetId);
    this.events.assetUpdated(req.assetId, status);
    this.events.invalidate(['dashboard', 'maintenance', 'assets']);
  }

  async raise(dto: CreateMaintenanceDto, user: { id: string; role: UserRole }) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });
    }

    // Non-managers may only raise requests for assets they currently hold.
    const privileged =
      user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;
    if (!privileged) {
      const holds = await this.prisma.allocation.findFirst({
        where: {
          assetId: dto.assetId,
          status: AllocationStatus.ACTIVE,
          holderUserId: user.id,
        },
        select: { id: true },
      });
      if (!holds) {
        throw new ForbiddenException({
          errorCode: 'FORBIDDEN',
          message: 'You can only raise maintenance for assets you hold',
        });
      }
    }

    return this.prisma.maintenanceRequest.create({
      data: {
        assetId: dto.assetId,
        raisedById: user.id,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        photoUrl: dto.photoUrl,
      },
    });
  }

  async approve(id: string, deciderId: string) {
    const req = await this.load(id);
    this.assertStatus(req.status, MaintenanceStatus.PENDING);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: MaintenanceStatus.APPROVED,
          decidedById: deciderId,
          decidedAt: new Date(),
        },
      });
      await this.stateMachine.transition(req.assetId, 'UNDER_MAINTENANCE', tx);
      return updated;
    });
    await this.announce(req, 'MAINTENANCE_APPROVED', 'UNDER_MAINTENANCE');
    return result;
  }

  async reject(id: string, dto: RejectMaintenanceDto, deciderId: string) {
    const req = await this.load(id);
    this.assertStatus(req.status, MaintenanceStatus.PENDING);
    const result = await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: MaintenanceStatus.REJECTED,
        decidedById: deciderId,
        decidedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });
    await this.announce(req, 'MAINTENANCE_REJECTED', req.status, {
      reason: dto.rejectionReason,
    });
    return result;
  }

  async assign(id: string, dto: AssignMaintenanceDto) {
    const req = await this.load(id);
    this.assertStatus(req.status, MaintenanceStatus.APPROVED);
    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: MaintenanceStatus.ASSIGNED,
        technicianName: dto.technicianName,
        assignedAt: new Date(),
      },
    });
  }

  async start(id: string) {
    const req = await this.load(id);
    this.assertStatus(req.status, MaintenanceStatus.ASSIGNED);
    return this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: MaintenanceStatus.IN_PROGRESS, startedAt: new Date() },
    });
  }

  async resolve(id: string, dto: ResolveMaintenanceDto) {
    const req = await this.load(id);
    this.assertStatus(req.status, MaintenanceStatus.IN_PROGRESS);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: MaintenanceStatus.RESOLVED,
          resolvedAt: new Date(),
          resolutionNotes: dto.resolutionNotes,
          cost: dto.cost,
        },
      });
      // Resolve returns the asset to its holder if still allocated, else free.
      const activeAllocation = await tx.allocation.findFirst({
        where: { assetId: req.assetId, status: AllocationStatus.ACTIVE },
        select: { id: true },
      });
      const nextStatus: AssetStatus = activeAllocation
        ? AssetStatus.ALLOCATED
        : AssetStatus.AVAILABLE;
      await this.stateMachine.transition(req.assetId, nextStatus, tx);
      return { updated, nextStatus };
    });
    this.events.maintenanceUpdated(id, 'RESOLVED', req.assetId);
    this.events.assetUpdated(req.assetId, result.nextStatus);
    this.events.invalidate(['dashboard', 'maintenance', 'assets']);
    return result.updated;
  }

  async findAll(query: MaintenanceQueryDto) {
    const { page = 1, limit = 20, assetId, status, priority } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.MaintenanceRequestWhereInput = {
      ...(assetId && { assetId }),
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [total, items] = await Promise.all([
      this.prisma.maintenanceRequest.count({ where }),
      this.prisma.maintenanceRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          raisedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    return this.load(id);
  }

  // --- helpers ------------------------------------------------------------

  private async load(id: string) {
    const req = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
    });
    if (!req) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Maintenance request not found',
      });
    }
    return req;
  }

  private assertStatus(
    current: MaintenanceStatus,
    expected: MaintenanceStatus,
  ): void {
    if (current !== expected) {
      throw new ConflictException({
        errorCode: 'INVALID_MAINTENANCE_TRANSITION',
        message: `Action requires status ${expected}, but request is ${current}`,
      });
    }
  }
}
