import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import { Prisma } from '@prisma/client';
import { AssetStateMachine } from './asset-state.machine';
import { calculateAssetHealth } from './health';
import type { CategoryField } from '../categories/category-field.type';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: AssetStateMachine,
  ) {}

  async create(dto: CreateAssetDto, userId: string) {
    // 1. Fetch category to validate custom fields
    const category = await this.prisma.assetCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    if (dto.customFieldValues) {
      this.validateCustomFields(
        dto.customFieldValues,
        asCategoryFields(category.fields),
      );
    }

    // 2. Generate asset_tag from sequence via raw SQL
    const tagRes = await this.prisma.$queryRaw<
      { nextval: string }[]
    >`SELECT nextval('asset_tag_seq')`;
    const tagNumber = tagRes[0].nextval;
    const assetTag = `AF-${String(tagNumber).padStart(4, '0')}`;

    try {
      return await this.prisma.asset.create({
        data: {
          ...dto,
          assetTag,
          createdById: userId,
          customFieldValues: dto.customFieldValues ?? Prisma.DbNull,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'CONFLICT',
          message: 'Serial Number already exists',
        });
      }
      throw error;
    }
  }

  async findAll(query: AssetQueryDto) {
    const {
      page = 1,
      limit = 20,
      q,
      sort,
      categoryId,
      departmentId,
      status,
      condition,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { assetTag: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(categoryId && { categoryId }),
      ...(departmentId && { departmentId }),
      ...(status && { status }),
      ...(condition && { condition }),
    };

    const [total, assets] = await Promise.all([
      this.prisma.asset.count({ where }),
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
        include: {
          category: { select: { id: true, name: true, icon: true } },
          department: { select: { id: true, name: true } },
          allocations: {
            where: { status: 'ACTIVE' },
            include: { holderUser: true, holderDepartment: true },
          },
          maintenanceRequests: {
            select: { status: true, priority: true, createdAt: true },
          },
        },
      }),
    ]);

    const data = assets.map((asset) => {
      const health = calculateAssetHealth(
        asset.condition,
        asset.acquisitionDate,
        asset.maintenanceRequests,
      );
      const { maintenanceRequests: _mr, allocations, ...rest } = asset;
      return {
        ...rest,
        currentAllocation: allocations[0] || null,
        healthScore: health.score,
        healthBand: health.band,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            holderUser: { select: { id: true, name: true, email: true } },
            holderDepartment: { select: { id: true, name: true } },
          },
        },
        maintenanceRequests: {
          select: { status: true, priority: true, createdAt: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });
    }

    const health = calculateAssetHealth(
      asset.condition,
      asset.acquisitionDate,
      asset.maintenanceRequests,
    );
    const { maintenanceRequests: _mr, ...rest } = asset;

    return {
      ...rest,
      healthScore: health.score,
      healthBand: health.band,
    };
  }

  async update(id: string, dto: UpdateAssetDto) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!asset)
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });

    if (dto.customFieldValues) {
      this.validateCustomFields(
        dto.customFieldValues,
        asCategoryFields(asset.category.fields),
      );
    }

    try {
      const { customFieldValues, ...rest } = dto;
      const data: Prisma.AssetUncheckedUpdateInput = { ...rest };
      if (customFieldValues !== undefined) {
        data.customFieldValues = customFieldValues ?? Prisma.DbNull;
      }

      return await this.prisma.asset.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'CONFLICT',
          message: 'Serial Number already exists',
        });
      }
      throw error;
    }
  }

  async getHistory(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset)
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });

    const allocations = await this.prisma.allocation.findMany({
      where: { assetId: id },
      include: { holderUser: true, holderDepartment: true },
      orderBy: { allocatedAt: 'desc' },
    });

    const maintenance = await this.prisma.maintenanceRequest.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      allocations,
      maintenance,
    };
  }

  async retire(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        allocations: { where: { status: 'ACTIVE' } },
        bookings: { where: { status: 'CONFIRMED', endAt: { gt: new Date() } } },
        maintenanceRequests: {
          where: { status: { notIn: ['RESOLVED', 'REJECTED'] } },
        },
      },
    });

    if (!asset)
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });

    if (asset.allocations.length > 0) {
      throw new ConflictException({
        errorCode: 'CONFLICT',
        message: 'Cannot retire asset with active allocation',
      });
    }
    if (asset.bookings.length > 0) {
      throw new ConflictException({
        errorCode: 'CONFLICT',
        message: 'Cannot retire asset with future bookings',
      });
    }
    if (asset.maintenanceRequests.length > 0) {
      throw new ConflictException({
        errorCode: 'CONFLICT',
        message: 'Cannot retire asset with open maintenance',
      });
    }

    await this.stateMachine.transition(id, 'RETIRED');
    return { message: 'Asset retired' };
  }

  async dispose(id: string) {
    await this.stateMachine.transition(id, 'DISPOSED');
    return { message: 'Asset disposed' };
  }

  async markFound(id: string) {
    await this.stateMachine.transition(id, 'AVAILABLE');
    return { message: 'Asset marked as found' };
  }

  async remove(id: string) {
    try {
      await this.prisma.asset.delete({ where: { id } });
      return { message: 'Asset deleted successfully' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException({
          errorCode: 'FOREIGN_KEY_VIOLATION',
          message: 'Cannot delete asset with associated records',
        });
      }
      throw error;
    }
  }

  private validateCustomFields(
    values: Record<string, unknown>,
    fieldsDef: CategoryField[],
  ): void {
    for (const field of fieldsDef) {
      const value = values[field.key];
      const missing = value === undefined || value === null || value === '';

      if (field.required && missing) {
        throw new BadRequestException(
          `Field ${field.label} (${field.key}) is required`,
        );
      }
      if (missing) {
        continue;
      }

      // Type validation against the frozen contract (text | number | date).
      if (field.type === 'number' && typeof value !== 'number') {
        throw new BadRequestException(`Field ${field.key} must be a number`);
      }
      if (field.type === 'text' && typeof value !== 'string') {
        throw new BadRequestException(`Field ${field.key} must be text`);
      }
      if (
        field.type === 'date' &&
        (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
      ) {
        throw new BadRequestException(
          `Field ${field.key} must be a valid date`,
        );
      }
    }
  }

  private parseSort(sort?: string): Prisma.AssetOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? 'desc' : 'asc' };
  }
}

/**
 * Narrow the JSONB `fields` column to the CategoryField[] contract.
 * The database stores field definitions produced by the categories module,
 * which validates their shape on write.
 */
function asCategoryFields(fields: Prisma.JsonValue): CategoryField[] {
  return Array.isArray(fields) ? (fields as unknown as CategoryField[]) : [];
}
