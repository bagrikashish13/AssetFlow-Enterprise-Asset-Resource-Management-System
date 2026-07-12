import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';
import { ReturnAllocationDto } from './dto/return-allocation.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AssetStatus, AllocationStatus, Prisma } from '@prisma/client';

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async allocate(dto: CreateAllocationDto, allocatorId: string) {
    if (!dto.holderUserId && !dto.holderDepartmentId) {
       throw new BadRequestException({ errorCode: 'BAD_REQUEST', message: 'Either holderUserId or holderDepartmentId must be provided' });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check if asset exists and is available
      const asset = await tx.asset.findUnique({
        where: { id: dto.assetId },
        select: { status: true, id: true }
      });

      if (!asset) {
         throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Asset not found' });
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
         throw new ConflictException({ errorCode: 'ASSET_UNAVAILABLE', message: `Asset is currently ${asset.status}` });
      }

      // 2. Create the allocation
      const allocation = await tx.allocation.create({
        data: {
           assetId: dto.assetId,
           holderUserId: dto.holderUserId,
           holderDepartmentId: dto.holderDepartmentId,
           expectedReturnAt: dto.expectedReturnAt ? new Date(dto.expectedReturnAt) : undefined,
           notes: dto.notes,
           allocatedById: allocatorId,
           status: AllocationStatus.ACTIVE,
        }
      });

      // 3. Update asset status
      await tx.asset.update({
        where: { id: dto.assetId },
        data: { status: AssetStatus.ALLOCATED }
      });

      return allocation;
    });
  }

  async returnAsset(id: string, dto: ReturnAllocationDto) {
     return this.prisma.$transaction(async (tx) => {
        const allocation = await tx.allocation.findUnique({
           where: { id },
           select: { id: true, assetId: true, status: true }
        });

        if (!allocation) {
           throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Allocation not found' });
        }

        if (allocation.status === AllocationStatus.RETURNED) {
           throw new ConflictException({ errorCode: 'ALREADY_RETURNED', message: 'This allocation has already been returned' });
        }

        // Update allocation
        const updatedAllocation = await tx.allocation.update({
           where: { id },
           data: {
              status: AllocationStatus.RETURNED,
              returnedAt: new Date(),
              returnCondition: dto.returnCondition,
              returnNotes: dto.returnNotes
           }
        });

        // Update asset
        await tx.asset.update({
           where: { id: allocation.assetId },
           data: {
              status: AssetStatus.AVAILABLE,
              ...(dto.returnCondition && { condition: dto.returnCondition })
           }
        });

        return updatedAllocation;
     });
  }

  async findAll(query: PaginationQueryDto & { assetId?: string, holderUserId?: string }) {
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
           allocatedBy: { select: { id: true, name: true } }
        }
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
