import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { DecisionTransferDto } from './dto/decision-transfer.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { TransferStatus, AllocationStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { DomainEventsService } from '../events/domain-events.service';
import { NOTIFICATION_TEMPLATES } from '../../common/constants/notification-templates';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: DomainEventsService,
  ) {}

  async create(dto: CreateTransferDto, requesterId: string) {
    if (!dto.targetUserId && !dto.targetDepartmentId) {
      throw new BadRequestException({
        errorCode: 'BAD_REQUEST',
        message: 'Target user or department must be specified',
      });
    }

    // Must find active allocation for this asset
    const activeAllocation = await this.prisma.allocation.findFirst({
      where: { assetId: dto.assetId, status: AllocationStatus.ACTIVE },
    });

    if (!activeAllocation) {
      throw new ConflictException({
        errorCode: 'NOT_ALLOCATED',
        message: 'Asset does not have an active allocation to transfer',
      });
    }

    try {
      return await this.prisma.transferRequest.create({
        data: {
          assetId: dto.assetId,
          fromAllocationId: activeAllocation.id,
          requestedById: requesterId,
          targetUserId: dto.targetUserId,
          targetDepartmentId: dto.targetDepartmentId,
          reason: dto.reason,
          status: TransferStatus.PENDING,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'TRANSFER_ALREADY_PENDING',
          message: 'A pending transfer request already exists for this asset',
        });
      }
      throw error;
    }
  }

  async approve(id: string, approverId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transferRequest.findUnique({ where: { id } });
      if (!transfer)
        throw new NotFoundException({
          errorCode: 'NOT_FOUND',
          message: 'Transfer request not found',
        });
      if (transfer.status !== TransferStatus.PENDING) {
        throw new ConflictException({
          errorCode: 'INVALID_STATE',
          message: 'Transfer is not pending',
        });
      }

      // Close old allocation
      await tx.allocation.update({
        where: { id: transfer.fromAllocationId },
        data: {
          status: AllocationStatus.RETURNED,
          returnedAt: new Date(),
          returnNotes: 'Transferred',
        },
      });

      // Create new allocation
      await tx.allocation.create({
        data: {
          assetId: transfer.assetId,
          holderUserId: transfer.targetUserId,
          holderDepartmentId: transfer.targetDepartmentId,
          allocatedById: approverId,
          status: AllocationStatus.ACTIVE,
          notes: `Transferred from allocation ${transfer.fromAllocationId}`,
        },
      });

      // Mark request approved
      return await tx.transferRequest.update({
        where: { id },
        data: {
          status: TransferStatus.APPROVED,
          decidedById: approverId,
          decidedAt: new Date(),
        },
      });
    });

    // After commit: notify the new holder and hint clients.
    const approved = await this.prisma.transferRequest.findUnique({
      where: { id },
      include: { asset: { select: { name: true, assetTag: true } } },
    });
    if (approved?.targetUserId && approved.asset) {
      const tpl = NOTIFICATION_TEMPLATES.TRANSFER_APPROVED;
      const params = {
        assetName: approved.asset.name,
        assetTag: approved.asset.assetTag,
      };
      await this.notifications.create({
        userId: approved.targetUserId,
        type: 'TRANSFER_APPROVED',
        title: tpl.title(params),
        body: tpl.body(params),
        entityType: 'transfer',
        entityId: id,
      });
    }
    this.events.transferUpdated(id, 'APPROVED');
    this.events.invalidate(['dashboard', 'transfers', 'allocations', 'assets']);
    return result;
  }

  async reject(id: string, dto: DecisionTransferDto, approverId: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { id },
    });
    if (!transfer)
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Transfer request not found',
      });
    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictException({
        errorCode: 'INVALID_STATE',
        message: 'Transfer is not pending',
      });
    }

    return await this.prisma.transferRequest.update({
      where: { id },
      data: {
        status: TransferStatus.REJECTED,
        decidedById: approverId,
        decidedAt: new Date(),
        decisionNote: dto.decisionNote,
      },
    });
  }

  async cancel(id: string, requesterId: string) {
    const transfer = await this.prisma.transferRequest.findUnique({
      where: { id },
    });
    if (!transfer)
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Transfer request not found',
      });

    // Only requester can cancel, but we could enforce this here or in controller guard
    if (transfer.requestedById !== requesterId) {
      throw new ConflictException({
        errorCode: 'FORBIDDEN',
        message: 'Only the requester can cancel the transfer',
      });
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new ConflictException({
        errorCode: 'INVALID_STATE',
        message: 'Transfer is not pending',
      });
    }

    return await this.prisma.transferRequest.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
    });
  }

  async findAll(query: PaginationQueryDto & { status?: TransferStatus }) {
    const { page = 1, limit = 20, sort, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransferRequestWhereInput = {
      ...(status && { status }),
    };

    const [total, transfers] = await Promise.all([
      this.prisma.transferRequest.count({ where }),
      this.prisma.transferRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          requestedBy: { select: { id: true, name: true } },
          targetUser: { select: { id: true, name: true } },
          targetDepartment: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: transfers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private parseSort(
    sort?: string,
  ): Prisma.TransferRequestOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? 'desc' : 'asc' };
  }
}
