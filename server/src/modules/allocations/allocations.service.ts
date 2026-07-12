import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ReturnAllocationDto } from './dto/return-allocation.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AssetStatus, AllocationStatus, Prisma } from '@prisma/client';
import { AssetStateMachine } from '../assets/asset-state.machine';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEventsService } from '../events/domain-events.service';
import { NOTIFICATION_TEMPLATES } from '../../common/constants/notification-templates';

@Injectable()
export class AllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AssetStateMachine,
    private readonly notifications: NotificationsService,
    private readonly events: DomainEventsService,
  ) {}

  async allocate(dto: CreateAllocationDto, allocatorId: string) {
    if (!dto.holderUserId && !dto.holderDepartmentId) {
      throw new BadRequestException({
        errorCode: 'BAD_REQUEST',
        message: 'Either holderUserId or holderDepartmentId must be provided',
      });
    }

    return this.prisma
      .$transaction(async (tx) => {
        // 1. Pessimistic Lock on Asset
        const assets = await tx.$queryRaw<
          { id: string; status: AssetStatus }[]
        >`
        SELECT id, status FROM assets WHERE id = ${dto.assetId}::uuid FOR UPDATE
      `;

        if (assets.length === 0) {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Asset not found',
          });
        }

        const asset = assets[0];

        // 2. State validation
        if (asset.status !== AssetStatus.AVAILABLE) {
          // Query current active allocation to provide conflict payload
          const activeAlloc = await tx.allocation.findFirst({
            where: { assetId: dto.assetId, status: AllocationStatus.ACTIVE },
            include: { holderUser: true, holderDepartment: true },
          });

          let conflictPayload = null;
          if (activeAlloc) {
            const isUser = !!activeAlloc.holderUserId;
            conflictPayload = {
              holderName: isUser
                ? activeAlloc.holderUser?.name
                : activeAlloc.holderDepartment?.name,
              holderType: isUser ? 'USER' : 'DEPARTMENT',
              since: activeAlloc.allocatedAt,
            };
          }

          throw new ConflictException({
            errorCode: 'ALLOCATION_CONFLICT',
            message: `Asset is currently ${asset.status}`,
            conflict: conflictPayload,
          });
        }

        // 3. Create the allocation
        const allocation = await tx.allocation.create({
          data: {
            assetId: dto.assetId,
            holderUserId: dto.holderUserId,
            holderDepartmentId: dto.holderDepartmentId,
            expectedReturnAt: dto.expectedReturnAt
              ? new Date(dto.expectedReturnAt)
              : undefined,
            notes: dto.notes,
            allocatedById: allocatorId,
            status: AllocationStatus.ACTIVE,
          },
        });

        // 4. Update asset status via state machine
        await this.stateMachine.transition(dto.assetId, 'ALLOCATED', tx);

        return allocation;
      })
      .then(async (allocation) => {
        // After-commit side effects: notify the holder and hint clients.
        if (allocation.holderUserId) {
          const asset = await this.prisma.asset.findUnique({
            where: { id: dto.assetId },
            select: { name: true, assetTag: true },
          });
          const tpl = NOTIFICATION_TEMPLATES.ASSET_ASSIGNED;
          const params = {
            assetName: asset?.name ?? 'Asset',
            assetTag: asset?.assetTag ?? '',
            date: allocation.expectedReturnAt
              ? allocation.expectedReturnAt.toDateString()
              : 'N/A',
          };
          await this.notifications.create({
            userId: allocation.holderUserId,
            type: 'ASSET_ASSIGNED',
            title: tpl.title(params),
            body: tpl.body(params),
            entityType: 'asset',
            entityId: dto.assetId,
          });
        }
        this.events.assetUpdated(dto.assetId, 'ALLOCATED');
        this.events.invalidate(['dashboard', 'allocations', 'assets']);
        return allocation;
      });
  }

  async returnAsset(id: string, dto: ReturnAllocationDto) {
    return this.prisma
      .$transaction(async (tx) => {
        const allocation = await tx.allocation.findUnique({
          where: { id },
          select: { id: true, assetId: true, status: true },
        });

        if (!allocation) {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Allocation not found',
          });
        }

        if (allocation.status === AllocationStatus.RETURNED) {
          throw new ConflictException({
            errorCode: 'ALREADY_RETURNED',
            message: 'This allocation has already been returned',
          });
        }

        // Update allocation
        const updatedAllocation = await tx.allocation.update({
          where: { id },
          data: {
            status: AllocationStatus.RETURNED,
            returnedAt: new Date(),
            returnCondition: dto.returnCondition,
            returnNotes: dto.returnNotes,
          },
        });

        if (dto.returnCondition) {
          await tx.asset.update({
            where: { id: allocation.assetId },
            data: { condition: dto.returnCondition },
          });
        }

        // Transition asset state
        await this.stateMachine.transition(allocation.assetId, 'AVAILABLE', tx);

        return updatedAllocation;
      })
      .then((updatedAllocation) => {
        this.events.assetUpdated(updatedAllocation.assetId, 'AVAILABLE');
        this.events.invalidate(['dashboard', 'allocations', 'assets']);
        return updatedAllocation;
      });
  }

  async findAll(
    query: PaginationQueryDto & { assetId?: string; holderUserId?: string },
  ) {
    const { page = 1, limit = 20, sort, assetId, holderUserId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AllocationWhereInput = {
      ...(assetId && { assetId }),
      ...(holderUserId && { holderUserId }),
    };

    const [total, allocations] = await Promise.all([
      this.prisma.allocation.count({ where }),
      this.prisma.allocation.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          holderUser: { select: { id: true, name: true, email: true } },
          holderDepartment: { select: { id: true, name: true } },
          allocatedBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: allocations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private parseSort(sort?: string): Prisma.AllocationOrderByWithRelationInput {
    if (!sort) return { allocatedAt: 'desc' };
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? 'desc' : 'asc' };
  }
}
