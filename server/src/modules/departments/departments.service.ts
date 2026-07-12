import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    try {
      return await this.prisma.department.create({
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ errorCode: 'CONFLICT', message: 'Department name already exists' });
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, q, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};

    const [total, departments] = await Promise.all([
      this.prisma.department.count({ where }),
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
        include: {
           departmentHead: { select: { id: true, name: true, email: true } },
           head: { select: { id: true, name: true } },
        }
      }),
    ]);

    return {
      data: departments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
         departmentHead: { select: { id: true, name: true, email: true } },
         head: { select: { id: true, name: true } },
         children: true,
      }
    });

    if (!department) {
      throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Department not found' });
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
       if (error instanceof Prisma.PrismaClientKnownRequestError) {
         if (error.code === 'P2025') {
            throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Department not found' });
         }
         if (error.code === 'P2002') {
            throw new ConflictException({ errorCode: 'CONFLICT', message: 'Department name already exists' });
         }
       }
       throw error;
    }
  }

  async remove(id: string) {
    try {
        await this.prisma.department.delete({
            where: { id }
        });
        return { message: 'Department deleted successfully' };
    } catch(error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
             if (error.code === 'P2025') {
                 throw new NotFoundException({ errorCode: 'NOT_FOUND', message: 'Department not found' });
             }
             if (error.code === 'P2003') {
                 throw new ConflictException({ errorCode: 'FOREIGN_KEY_VIOLATION', message: 'Cannot delete department with assigned users or sub-departments' });
             }
        }
        throw error;
    }
  }

  private parseSort(sort?: string): Prisma.DepartmentOrderByWithRelationInput {
      if (!sort) return { name: 'asc' };
      const desc = sort.startsWith('-');
      const field = desc ? sort.substring(1) : sort;
      return { [field]: desc ? 'desc' : 'asc' };
  }
}
