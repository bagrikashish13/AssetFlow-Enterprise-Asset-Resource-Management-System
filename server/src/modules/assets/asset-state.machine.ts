import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** A Prisma client that may be the base service or an interactive tx client. */
type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class AssetStateMachine {
  constructor(private prisma: PrismaService) {}

  // Allowed transitions per docs/03-DATABASE-DESIGN.md §7.1.
  private readonly transitions: Record<AssetStatus, AssetStatus[]> = {
    AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'RETIRED'],
    RESERVED: ['AVAILABLE', 'UNDER_MAINTENANCE'],
    ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE'],
    UNDER_MAINTENANCE: ['ALLOCATED', 'AVAILABLE', 'RETIRED'],
    LOST: ['AVAILABLE'],
    RETIRED: ['DISPOSED'],
    DISPOSED: [],
  };

  /**
   * Whether a transition from currentStatus to nextStatus is allowed.
   * Audit cycle closure may move almost any asset to LOST (except DISPOSED).
   */
  canTransition(currentStatus: AssetStatus, nextStatus: AssetStatus): boolean {
    if (nextStatus === 'LOST' && currentStatus !== 'DISPOSED') {
      return true;
    }
    return this.transitions[currentStatus]?.includes(nextStatus) ?? false;
  }

  /**
   * Transition the asset to a new status, validating the move first.
   * @throws NotFoundException when the asset does not exist.
   * @throws ConflictException (INVALID_STATE_TRANSITION) for illegal moves.
   */
  async transition(
    assetId: string,
    nextStatus: AssetStatus,
    tx?: PrismaClientLike,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    const asset = await db.asset.findUnique({
      where: { id: assetId },
      select: { status: true },
    });

    if (!asset) {
      throw new NotFoundException({
        errorCode: 'NOT_FOUND',
        message: 'Asset not found',
      });
    }

    if (!this.canTransition(asset.status, nextStatus)) {
      throw new ConflictException({
        errorCode: 'INVALID_STATE_TRANSITION',
        message: `Cannot transition asset from ${asset.status} to ${nextStatus}`,
      });
    }

    await db.asset.update({
      where: { id: assetId },
      data: { status: nextStatus },
    });
  }
}
