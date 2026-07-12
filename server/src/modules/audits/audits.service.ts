import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  AuditCycleStatus,
  AuditResult,
  AssetCondition,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetStateMachine } from '../assets/asset-state.machine';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEventsService } from '../events/domain-events.service';
import { NOTIFICATION_TEMPLATES } from '../../common/constants/notification-templates';
import { CreateAuditDto } from './dto/create-audit.dto';
import { RecordVerdictDto } from './dto/record-verdict.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AssetStateMachine,
    private readonly notifications: NotificationsService,
    private readonly events: DomainEventsService,
  ) {}

  async create(dto: CreateAuditDto, creatorId: string) {
    const auditors = await this.prisma.user.findMany({
      where: { id: { in: dto.auditorIds }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (auditors.length !== dto.auditorIds.length) {
      throw new BadRequestException({
        errorCode: 'INVALID_AUDITORS',
        message: 'One or more auditors were not found or are inactive',
      });
    }

    // Snapshot the in-scope assets (exclude already-disposed assets).
    const scopedAssets = await this.prisma.asset.findMany({
      where: {
        status: { not: 'DISPOSED' },
        ...(dto.departmentId && { departmentId: dto.departmentId }),
        ...(dto.location && {
          location: { contains: dto.location, mode: 'insensitive' },
        }),
      },
      select: { id: true },
    });
    if (scopedAssets.length === 0) {
      throw new BadRequestException({
        errorCode: 'EMPTY_SCOPE',
        message: 'No assets match the audit scope',
      });
    }

    const cycle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.auditCycle.create({
        data: {
          name: dto.name,
          departmentId: dto.departmentId,
          location: dto.location,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          createdById: creatorId,
        },
      });
      await tx.auditAssignment.createMany({
        data: dto.auditorIds.map((auditorId) => ({
          cycleId: created.id,
          auditorId,
        })),
      });
      await tx.auditRecord.createMany({
        data: scopedAssets.map((a) => ({ cycleId: created.id, assetId: a.id })),
      });
      return created;
    });

    // Notify assigned auditors.
    const tpl = NOTIFICATION_TEMPLATES.AUDIT_ASSIGNED;
    await this.notifications.createMany(
      dto.auditorIds.map((auditorId) => ({
        userId: auditorId,
        type: 'AUDIT_ASSIGNED',
        title: tpl.title({ cycleName: dto.name }),
        body: tpl.body({ cycleName: dto.name }),
        entityType: 'audit',
        entityId: cycle.id,
      })),
    );
    this.events.invalidate(['dashboard', 'audits']);

    return this.findOne(cycle.id);
  }

  async findAll(
    query: PaginationQueryDto & { status?: AuditCycleStatus },
    user: { id: string; role: UserRole },
  ) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    // Auditors who are not managers see only cycles they are assigned to.
    const privileged =
      user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;
    const where: Prisma.AuditCycleWhereInput = {
      ...(status && { status }),
      ...(privileged ? {} : { assignments: { some: { auditorId: user.id } } }),
    };

    const [total, cycles] = await Promise.all([
      this.prisma.auditCycle.count({ where }),
      this.prisma.auditCycle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          assignments: {
            include: { auditor: { select: { id: true, name: true } } },
          },
          _count: { select: { records: true } },
        },
      }),
    ]);

    const data = await Promise.all(
      cycles.map(async (c) => ({
        ...c,
        auditors: c.assignments.map((a) => a.auditor),
        progress: await this.progress(c.id),
      })),
    );

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const cycle = await this.prisma.auditCycle.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignments: {
          include: { auditor: { select: { id: true, name: true } } },
        },
      },
    });
    if (!cycle) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Audit cycle not found',
      });
    }
    return {
      ...cycle,
      auditors: cycle.assignments.map((a) => a.auditor),
      progress: await this.progress(id),
    };
  }

  async records(cycleId: string) {
    await this.assertCycleExists(cycleId);
    return this.prisma.auditRecord.findMany({
      where: { cycleId },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetTag: true,
            location: true,
            allocations: {
              where: { status: 'ACTIVE' },
              select: {
                holderUser: { select: { id: true, name: true } },
                holderDepartment: { select: { id: true, name: true } },
              },
            },
          },
        },
        auditor: { select: { id: true, name: true } },
      },
      orderBy: { asset: { assetTag: 'asc' } },
    });
  }

  async recordVerdict(
    cycleId: string,
    recordId: string,
    dto: RecordVerdictDto,
    auditor: { id: string; role: UserRole },
  ) {
    const cycle = await this.assertCycleExists(cycleId);
    if (cycle.status === AuditCycleStatus.CLOSED) {
      throw new ConflictException({
        errorCode: 'CYCLE_CLOSED',
        message: 'This audit cycle is closed and cannot be modified',
      });
    }

    // Only assigned auditors (or managers) may record verdicts.
    const privileged =
      auditor.role === UserRole.ADMIN ||
      auditor.role === UserRole.ASSET_MANAGER;
    if (!privileged) {
      const assigned = await this.prisma.auditAssignment.findUnique({
        where: { cycleId_auditorId: { cycleId, auditorId: auditor.id } },
      });
      if (!assigned) {
        throw new ForbiddenException({
          errorCode: 'FORBIDDEN',
          message: 'You are not assigned to this audit cycle',
        });
      }
    }

    const record = await this.prisma.auditRecord.findFirst({
      where: { id: recordId, cycleId },
    });
    if (!record) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Audit record not found',
      });
    }

    const updated = await this.prisma.auditRecord.update({
      where: { id: recordId },
      data: {
        result: dto.result,
        notes: dto.notes,
        auditorId: auditor.id,
        checkedAt: new Date(),
      },
    });
    this.events.invalidate(['audits']);
    return updated;
  }

  async discrepancies(cycleId: string) {
    await this.assertCycleExists(cycleId);
    return this.prisma.auditRecord.findMany({
      where: {
        cycleId,
        result: { in: [AuditResult.MISSING, AuditResult.DAMAGED] },
      },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, location: true },
        },
        auditor: { select: { id: true, name: true } },
      },
      orderBy: { result: 'asc' },
    });
  }

  async close(cycleId: string) {
    const cycle = await this.assertCycleExists(cycleId);
    if (cycle.status === AuditCycleStatus.CLOSED) {
      throw new ConflictException({
        errorCode: 'CYCLE_CLOSED',
        message: 'Audit cycle is already closed',
      });
    }

    const flagged = await this.prisma.auditRecord.findMany({
      where: {
        cycleId,
        result: { in: [AuditResult.MISSING, AuditResult.DAMAGED] },
      },
      select: { assetId: true, result: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.auditCycle.update({
        where: { id: cycleId },
        data: { status: AuditCycleStatus.CLOSED, closedAt: new Date() },
      });
      for (const record of flagged) {
        if (record.result === AuditResult.MISSING) {
          // Confirmed-missing assets become LOST.
          await this.stateMachine.transition(record.assetId, 'LOST', tx);
        } else {
          // Damaged assets are flagged in poor condition.
          await tx.asset.update({
            where: { id: record.assetId },
            data: { condition: AssetCondition.POOR },
          });
        }
      }
    });

    // Notify the cycle creator of each discrepancy.
    if (flagged.length > 0) {
      const tpl = NOTIFICATION_TEMPLATES.AUDIT_DISCREPANCY;
      const assets = await this.prisma.asset.findMany({
        where: { id: { in: flagged.map((f) => f.assetId) } },
        select: { id: true, name: true, assetTag: true },
      });
      await this.notifications.createMany(
        assets.map((a) => ({
          userId: cycle.createdById,
          type: 'AUDIT_DISCREPANCY',
          title: tpl.title({ cycleName: cycle.name }),
          body: tpl.body({
            assetName: a.name,
            assetTag: a.assetTag,
            cycleName: cycle.name,
          }),
          entityType: 'audit',
          entityId: cycleId,
        })),
      );
    }
    this.events.invalidate(['dashboard', 'audits', 'assets']);

    return this.findOne(cycleId);
  }

  // --- helpers ------------------------------------------------------------

  private async assertCycleExists(cycleId: string) {
    const cycle = await this.prisma.auditCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Audit cycle not found',
      });
    }
    return cycle;
  }

  private async progress(cycleId: string) {
    const grouped = await this.prisma.auditRecord.groupBy({
      by: ['result'],
      where: { cycleId },
      _count: true,
    });
    const count = (result: AuditResult | null) =>
      grouped.find((g) => g.result === result)?._count ?? 0;
    const verified = count(AuditResult.VERIFIED);
    const missing = count(AuditResult.MISSING);
    const damaged = count(AuditResult.DAMAGED);
    const unchecked = count(null);
    const total = verified + missing + damaged + unchecked;
    return { total, checked: total - unchecked, verified, missing, damaged };
  }
}
