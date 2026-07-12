import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, BookingStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { BookingQueryDto, AvailabilityQueryDto } from './dto/booking-query.dto';
import { suggestSlots, Slot } from './slot-suggester';

const MAX_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const DEFAULT_DURATION_MIN = 60;

type BookingPhase = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Derive the read-time phase; never stored. See docs/03 §7.3. */
  private phase(booking: {
    status: BookingStatus;
    startAt: Date;
    endAt: Date;
  }): BookingPhase {
    if (booking.status === BookingStatus.CANCELLED) return 'CANCELLED';
    const now = Date.now();
    if (now < booking.startAt.getTime()) return 'UPCOMING';
    if (now < booking.endAt.getTime()) return 'ONGOING';
    return 'COMPLETED';
  }

  private withPhase<
    T extends { status: BookingStatus; startAt: Date; endAt: Date },
  >(booking: T): T & { phase: BookingPhase } {
    return { ...booking, phase: this.phase(booking) };
  }

  async create(dto: CreateBookingDto, userId: string) {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    this.validateWindow(start, end);

    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      select: { id: true, isBookable: true, status: true },
    });
    if (!asset) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });
    }
    if (!asset.isBookable) {
      throw new BadRequestException({
        errorCode: 'ASSET_NOT_BOOKABLE',
        message: 'This asset is not a bookable resource',
      });
    }
    if (['LOST', 'RETIRED', 'DISPOSED'].includes(asset.status)) {
      throw new BadRequestException({
        errorCode: 'ASSET_NOT_BOOKABLE',
        message: `Asset is ${asset.status} and cannot be booked`,
      });
    }

    await this.assertNoOverlap(dto.assetId, start, end);

    try {
      const booking = await this.prisma.booking.create({
        data: {
          assetId: dto.assetId,
          bookedById: userId,
          forDepartmentId: dto.forDepartmentId,
          purpose: dto.purpose,
          startAt: start,
          endAt: end,
        },
      });
      return this.withPhase(booking);
    } catch (error) {
      // Race backstop: the exclusion constraint may reject a concurrent insert.
      await this.rethrowOverlap(error, dto.assetId, start, end);
      throw error;
    }
  }

  async reschedule(
    id: string,
    dto: RescheduleBookingDto,
    user: {
      id: string;
      role: UserRole;
    },
  ) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Booking not found',
      });
    }
    this.assertMutable(booking, user);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException({
        errorCode: 'BOOKING_CANCELLED',
        message: 'Cannot reschedule a cancelled booking',
      });
    }

    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    this.validateWindow(start, end);
    await this.assertNoOverlap(booking.assetId, start, end, id);

    try {
      const updated = await this.prisma.booking.update({
        where: { id },
        data: { startAt: start, endAt: end },
      });
      return this.withPhase(updated);
    } catch (error) {
      await this.rethrowOverlap(error, booking.assetId, start, end, id);
      throw error;
    }
  }

  async cancel(id: string, user: { id: string; role: UserRole }) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Booking not found',
      });
    }
    this.assertMutable(booking, user);
    if (booking.status === BookingStatus.CANCELLED) {
      throw new ConflictException({
        errorCode: 'BOOKING_CANCELLED',
        message: 'Booking is already cancelled',
      });
    }
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
    });
    return this.withPhase(updated);
  }

  async availability(query: AvailabilityQueryDto) {
    const from = new Date(query.from);
    const durationMin = query.durationMinutes
      ? Number(query.durationMinutes)
      : DEFAULT_DURATION_MIN;
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

    const busy = await this.confirmedSlots(query.assetId, from, to);
    const suggestions = suggestSlots(busy, durationMin * 60 * 1000, from);

    return {
      busy: busy.map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
      })),
      suggestions: suggestions.map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
      })),
    };
  }

  async findAll(query: BookingQueryDto, user: { id: string; role: UserRole }) {
    const { page = 1, limit = 20, assetId, from, to, status, mine } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      ...(assetId && { assetId }),
      ...(status && { status }),
      ...(mine === 'true' && { bookedById: user.id }),
      ...(from || to
        ? {
            startAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };

    const [total, bookings] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'asc' },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
          bookedBy: { select: { id: true, name: true } },
          forDepartment: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      data: bookings.map((b) => this.withPhase(b)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // --- helpers ------------------------------------------------------------

  private validateWindow(start: Date, end: Date): void {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException({
        errorCode: 'VALIDATION_FAILED',
        message: 'Invalid start or end time',
      });
    }
    if (end <= start) {
      throw new BadRequestException({
        errorCode: 'VALIDATION_FAILED',
        message: 'endAt must be after startAt',
      });
    }
    if (end.getTime() - start.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException({
        errorCode: 'VALIDATION_FAILED',
        message: 'Booking cannot exceed 12 hours',
      });
    }
    if (start.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new BadRequestException({
        errorCode: 'VALIDATION_FAILED',
        message: 'Booking cannot start in the past',
      });
    }
  }

  private async confirmedSlots(
    assetId: string,
    from: Date,
    to: Date,
  ): Promise<Slot[]> {
    const rows = await this.prisma.booking.findMany({
      where: {
        assetId,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { startAt: true, endAt: true },
      orderBy: { startAt: 'asc' },
    });
    return rows.map((r) => ({ startAt: r.startAt, endAt: r.endAt }));
  }

  /** Pre-check overlap and throw the friendly 409 with slot suggestions. */
  private async assertNoOverlap(
    assetId: string,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<void> {
    const clash = await this.prisma.booking.findFirst({
      where: {
        assetId,
        status: BookingStatus.CONFIRMED,
        startAt: { lt: end },
        endAt: { gt: start },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (clash) {
      await this.throwOverlap(assetId, start, end);
    }
  }

  private async throwOverlap(
    assetId: string,
    start: Date,
    end: Date,
  ): Promise<never> {
    const horizon = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const busy = await this.confirmedSlots(assetId, start, horizon);
    const suggestions = suggestSlots(
      busy,
      end.getTime() - start.getTime(),
      start,
    );
    throw new ConflictException({
      errorCode: 'BOOKING_OVERLAP',
      message: 'The requested time slot overlaps an existing booking',
      suggestions: suggestions.map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
      })),
    });
  }

  /** If a DB error is the exclusion violation, convert it to the 409. */
  private async rethrowOverlap(
    error: unknown,
    assetId: string,
    start: Date,
    end: Date,
    _excludeId?: string,
  ): Promise<void> {
    const code =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? ((error.meta as { code?: string } | undefined)?.code ?? error.code)
        : undefined;
    if (code === '23P01') {
      await this.throwOverlap(assetId, start, end);
    }
  }

  private assertMutable(
    booking: { bookedById: string },
    user: { id: string; role: UserRole },
  ): void {
    const privileged =
      user.role === UserRole.ADMIN || user.role === UserRole.ASSET_MANAGER;
    if (!privileged && booking.bookedById !== user.id) {
      throw new ForbiddenException({
        errorCode: 'FORBIDDEN',
        message: 'You can only modify your own bookings',
      });
    }
  }
}
