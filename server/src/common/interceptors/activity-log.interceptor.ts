import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedRequest } from '../types/authenticated-request';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((payload: unknown) => {
        void this.logActivity(request, payload).catch((err) => {
          this.logger.error('Failed to write activity log', err);
        });
      }),
    );
  }

  private async logActivity(
    request: AuthenticatedRequest,
    payload: unknown,
  ): Promise<void> {
    const user = request.user;
    if (!user) {
      return; // Unauthenticated mutations (login/signup) are not audited here.
    }

    const urlParts = request.path.split('/');
    // e.g. /api/v1/assets -> "assets"
    const entityType = urlParts[3] || urlParts[2] || 'unknown';

    const params = request.params as Record<string, string | undefined>;
    const responseId =
      payload && typeof payload === 'object' && 'id' in payload
        ? String(payload.id)
        : undefined;
    const entityId = params.id ?? responseId;

    if (!entityId) {
      return;
    }

    await this.prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: request.method,
        entityType,
        entityId,
        summary: `${request.method} on ${entityType}`,
        metadata: {
          path: request.path,
          body: request.body as Prisma.InputJsonValue,
        },
      },
    });
  }
}
