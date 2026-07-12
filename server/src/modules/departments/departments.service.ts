import {
  Injectable,
  NotFoundException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'CONFLICT',
          message: 'Department name already exists',
        });
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
        },
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
      },
    });

    if (!department) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Department not found',
      });
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new HttpException(
          {
            errorCode: 'DEPARTMENT_CYCLE',
            message: 'A department cannot be its own parent',
          },
          422,
        );
      }

      // Recursive CTE to check if the proposed parent is a descendant of this department
      const cycleCheck = await this.prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE dept_tree AS (
          SELECT id, parent_id FROM departments WHERE id = ${id}::uuid
          UNION ALL
          SELECT d.id, d.parent_id FROM departments d
          INNER JOIN dept_tree dt ON dt.id = d.parent_id
        )
        SELECT id FROM dept_tree WHERE id = ${dto.parentId}::uuid LIMIT 1;
      `;

      if (cycleCheck.length > 0) {
        throw new HttpException(
          {
            errorCode: 'DEPARTMENT_CYCLE',
            message:
              'Cycle detected: cannot set parent to a descendant department',
          },
          422,
        );
      }
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Department not found',
          });
        }
        if (error.code === 'P2002') {
          throw new ConflictException({
            errorCode: 'CONFLICT',
            message: 'Department name already exists',
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.department.delete({
        where: { id },
      });
      return { message: 'Department deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'Department not found',
          });
        }
        if (error.code === 'P2003') {
          throw new ConflictException({
            errorCode: 'FOREIGN_KEY_VIOLATION',
            message:
              'Cannot delete department with assigned users or sub-departments',
          });
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
