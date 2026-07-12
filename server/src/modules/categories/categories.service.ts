import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    try {
      return await this.prisma.assetCategory.create({
        data: dto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'CONFLICT',
          message: 'Category name already exists',
        });
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, q, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetCategoryWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};

    const [total, categories] = await Promise.all([
      this.prisma.assetCategory.count({ where }),
      this.prisma.assetCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
      }),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.assetCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      return await this.prisma.assetCategory.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Category not found',
          });
        }
        if (error.code === 'P2002') {
          throw new ConflictException({
            errorCode: 'CONFLICT',
            message: 'Category name already exists',
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.assetCategory.delete({
        where: { id },
      });
      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Category not found',
          });
        }
        if (error.code === 'P2003') {
          throw new ConflictException({
            errorCode: 'FOREIGN_KEY_VIOLATION',
            message:
              'Cannot delete category with associated assets or sub-categories',
          });
        }
      }
      throw error;
    }
  }

  private parseSort(
    sort?: string,
  ): Prisma.AssetCategoryOrderByWithRelationInput {
    if (!sort) return { name: 'asc' };
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? 'desc' : 'asc' };
  }
}
