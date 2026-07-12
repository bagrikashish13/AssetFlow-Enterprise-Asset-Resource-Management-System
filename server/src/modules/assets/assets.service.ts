import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetQueryDto } from './dto/asset-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAssetDto, userId: string) {
    try {
      const assetTag = dto.assetTag || `AST-${Date.now()}`;
      
      return await this.prisma.asset.create({
        data: {
          ...dto,
          assetTag,
          createdById: userId,
          customFieldValues: dto.customFieldValues ?? Prisma.DbNull,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ errorCode: 'CONFLICT', message: 'Asset Tag or Serial Number already exists' });
      }
      throw error;
    }
  }

  async findAll(query: AssetQueryDto) {
    const { page = 1, limit = 20, q, sort, categoryId, departmentId, status, condition } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { assetTag: { contains: q, mode: 'insensitive' } },
          { serialNumber: { contains: q, mode: 'insensitive' } },
        ]
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
        }
      }),
    ]);

    return {
      data: assets,
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
               holderDepartment: { select: { id: true, name: true } }
            }
         },
      }
    });

    if (!asset) {
      throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Asset not found' });
    }

    return asset;
  }

  async update(id: string, dto: UpdateAssetDto) {
    try {
      const dataToUpdate: any = { ...dto };
      
      if (dto.customFieldValues !== undefined) {
         dataToUpdate.customFieldValues = dto.customFieldValues === null ? Prisma.DbNull : dto.customFieldValues;
      }
      
      return await this.prisma.asset.update({
        where: { id },
        data: dataToUpdate,
      });
    } catch (error) {
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
         if (error.code === 'P2025') {
            throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Asset not found' });
         }
         if (error.code === 'P2002') {
            throw new ConflictException({ errorCode: 'CONFLICT', message: 'Asset Tag or Serial Number already exists' });
         }
       }
       throw error;
    }
  }

  async remove(id: string) {
    try {
        await this.prisma.asset.delete({
            where: { id }
        });
        return { message: 'Asset deleted successfully' };
    } catch(error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') {
                 throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Asset not found' });
             }
             if (error.code === 'P2003') {
                 throw new ConflictException({ errorCode: 'FOREIGN_KEY_VIOLATION', message: 'Cannot delete asset with associated records (allocations, bookings, etc)' });
             }
        }
        throw error;
    }
  }

  private parseSort(sort?: string): Prisma.AssetOrderByWithRelationInput {
      if (!sort) return { createdAt: 'desc' };
      const desc = sort.startsWith('-');
      const field = desc ? sort.substring(1) : sort;
      return { [field]: desc ? 'desc' : 'asc' };
  }
}
