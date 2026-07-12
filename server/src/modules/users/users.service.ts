import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    try {
      // Create user with a dummy password hash (e.g. they must set it via email link in a real app)
      const dummyPasswordHash = await bcrypt.hash('Changeme123!', 10);

      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash: dummyPasswordHash,
          role: dto.role,
          departmentId: dto.departmentId,
        },
      });
      return this.excludePassword(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          errorCode: 'EMAIL_TAKEN',
          message: 'Email is already in use',
        });
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, q, sort } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    // Do not return hard-deleted users (where status = DELETED if we implement soft delete).
    // The current schema uses 'INACTIVE' and 'SUSPENDED' for deactivated accounts. We'll show all.

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.parseSort(sort),
        include: { department: true },
      }),
    ]);

    return {
      data: users.map((user) => this.excludePassword(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!user) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return this.excludePassword(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...dto,
          email: dto.email ? dto.email.toLowerCase() : undefined,
        },
        include: { department: true },
      });
      return this.excludePassword(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            errorCode: 'NOT_FOUND',
            message: 'User not found',
          });
        }
        if (error.code === 'P2002') {
          throw new ConflictException({
            errorCode: 'EMAIL_TAKEN',
            message: 'Email is already in use',
          });
        }
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { status: dto.status },
      });
      return this.excludePassword(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          errorCode: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      throw error;
    }
  }

  async updateRole(id: string, dto: UpdateUserRoleDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: { role: dto.role },
      });
      return this.excludePassword(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          errorCode: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      throw error;
    }
  }

  async resetPassword(id: string) {
    // Generate a secure random 12 character password
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Ensure it meets minimum requirements (≥ 8 chars, ≥ 1 letter, ≥ 1 number)
    tempPassword = 'A1!' + tempPassword;

    const passwordHash = await bcrypt.hash(tempPassword, 10);

    try {
      await this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
      return { tempPassword };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          errorCode: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      throw error;
    }
  }

  async remove(id: string) {
    // Soft delete equivalent for this schema: update status to INACTIVE or delete the record.
    // LLD says "Soft deletion" for most things. We can just delete it or mark INACTIVE.
    try {
      await this.prisma.user.update({
        where: { id },
        data: { status: 'INACTIVE' }, // Assuming INACTIVE represents soft-delete or suspension for now. Or we can just perform actual delete if required. Let's do soft-delete via status.
      });
      return { message: 'User deactivated successfully' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException({
          errorCode: 'NOT_FOUND',
          message: 'User not found',
        });
      }
      throw error;
    }
  }

  private excludePassword<T extends { passwordHash: string }>(
    user: T,
  ): Omit<T, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private parseSort(sort?: string): Prisma.UserOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const desc = sort.startsWith('-');
    const field = desc ? sort.substring(1) : sort;
    return { [field]: desc ? 'desc' : 'asc' };
  }
}
