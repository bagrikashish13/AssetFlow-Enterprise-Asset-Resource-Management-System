import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any[] | undefined = undefined;
    let suggestions: any[] | undefined = undefined;
    const extraPayload: any = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res: any = exception.getResponse();
      
      if (typeof res === 'object' && res !== null) {
        if (statusCode === HttpStatus.BAD_REQUEST && Array.isArray(res.message)) {
            errorCode = 'VALIDATION_FAILED';
            message = 'Validation failed';
            details = res.message.map((msg: string) => ({ message: msg }));
        } else {
            errorCode = res.errorCode || this.mapStatusCodeToErrorCode(statusCode);
            message = res.message || exception.message;
            if (res.details) details = res.details;
            if (res.suggestions) suggestions = res.suggestions;
            
            // Map conflict object to extra payload for custom 409s
            Object.keys(res).forEach(key => {
                if (!['statusCode', 'errorCode', 'message', 'error', 'details', 'suggestions'].includes(key)) {
                    extraPayload[key] = res[key];
                }
            });
        }
      } else {
         message = res;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          errorCode = 'CONFLICT';
          message = `Unique constraint failed on the fields: ${(exception.meta?.target as string[])?.join(', ')}`;
          if ((exception.meta?.target as string[])?.includes('email')) {
             errorCode = 'EMAIL_TAKEN';
          }
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          errorCode = 'NOT_FOUND';
          message = 'Record not found';
          break;
        case 'P2003':
          statusCode = HttpStatus.CONFLICT;
          errorCode = 'FOREIGN_KEY_VIOLATION';
          message = 'Foreign key constraint failed';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          errorCode = 'DATABASE_ERROR';
          message = `Database error: ${exception.message}`;
      }
    } else {
        this.logger.error(exception);
        if (exception instanceof Error) {
            message = exception.message;
        }
    }

    response.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      ...(details && { details }),
      ...(suggestions && { suggestions }),
      ...extraPayload,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private mapStatusCodeToErrorCode(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHENTICATED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 422: return 'UNPROCESSABLE_ENTITY';
      case 429: return 'RATE_LIMITED';
      default: return 'INTERNAL_ERROR';
    }
  }
}
