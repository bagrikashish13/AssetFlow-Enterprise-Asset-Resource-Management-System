import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

export interface AppNotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Single surface every domain service uses to emit realtime events after a
 * commit. Clients treat all payloads except notifications as cache-invalidation
 * hints (they trigger a refetch), never as authoritative state.
 */
@Injectable()
export class DomainEventsService {
  constructor(private readonly gateway: EventsGateway) {}

  private get server() {
    return this.gateway.server;
  }

  /** Deliver a notification to its owner's room. */
  notify(userId: string, notification: AppNotificationPayload): void {
    this.server?.to(`user:${userId}`).emit('notification:new', notification);
  }

  /** Tell every client which query keys to invalidate. */
  invalidate(keys: string[]): void {
    this.server?.emit('kpi:invalidate', { keys });
  }

  assetUpdated(assetId: string, status: string): void {
    this.server?.emit('asset:updated', { assetId, status });
  }

  bookingChanged(assetId: string, bookingId: string): void {
    this.server?.emit('booking:changed', { assetId, bookingId });
  }

  transferUpdated(transferId: string, status: string): void {
    this.server?.emit('transfer:updated', { transferId, status });
  }

  maintenanceUpdated(requestId: string, status: string, assetId: string): void {
    this.server?.emit('maintenance:updated', { requestId, status, assetId });
  }
}
