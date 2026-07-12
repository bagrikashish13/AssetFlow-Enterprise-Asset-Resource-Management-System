import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    
    // Only log mutations
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap((responsePayload) => {
          this.logActivity(request, responsePayload).catch((err) => {
             console.error('Failed to write activity log', err);
          });
        }),
      );
    }

    return next.handle();
  }

  private async logActivity(request: any, responsePayload: any) {
     const user = request.user;
     if (!user) return; // Ignore unauthenticated mutations like login/signup

     const urlParts = request.path.split('/');
     const entityType = urlParts[3] || urlParts[2] || 'unknown'; // e.g. /api/v1/assets -> assets
     
     // Try to infer entity ID from params or response payload
     let entityId = request.params.id || responsePayload?.id || 'unknown';
     
     if (entityId !== 'unknown') {
         await this.prisma.activityLog.create({
             data: {
                 actorId: user.id,
                 action: request.method,
                 entityType,
                 entityId,
                 summary: `${request.method} on ${entityType}`,
                 metadata: {
                     path: request.path,
                     body: request.body,
                 }
             }
         });
     }
  }
}
