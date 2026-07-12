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

interface ErrorDetail {
  field?: string;
  message: string;
}

/** Shape of the object an HttpException may carry as its response body. */
interface ExceptionResponseBody {
  statusCode?: number;
  error?: string;
  errorCode?: string;
  message?: string | string[];
  details?: ErrorDetail[];
  suggestions?: unknown[];
  [key: string]: unknown;
}

const RESERVED_KEYS = new Set([
  'statusCode',
  'errorCode',
  'message',
  'error',
  'details',
  'suggestions',
]);

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: ErrorDetail[] | undefined;
    let suggestions: unknown[] | undefined;
    const extraPayload: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else {
        const body = res as ExceptionResponseBody;

        if (
          statusCode === HttpStatus.BAD_REQUEST &&
          Array.isArray(body.message)
        ) {
          errorCode = 'VALIDATION_FAILED';
          message = 'Validation failed';
          details = body.message.map((msg) => ({ message: msg }));
        } else {
          errorCode =
            body.errorCode ?? this.mapStatusCodeToErrorCode(statusCode);
          message =
            (typeof body.message === 'string' ? body.message : undefined) ??
            exception.message;
          if (body.details) details = body.details;
          if (body.suggestions) suggestions = body.suggestions;

          // Preserve any custom payload keys (e.g. `conflict` on 409s).
          for (const [key, value] of Object.entries(body)) {
            if (!RESERVED_KEYS.has(key)) {
              extraPayload[key] = value;
            }
          }
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ statusCode, errorCode, message } = this.mapPrismaError(exception));
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

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    errorCode: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = exception.meta?.target;
        const fields = Array.isArray(target) ? target.join(', ') : 'fields';
        const isEmail = Array.isArray(target) && target.includes('email');
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: isEmail ? 'EMAIL_TAKEN' : 'CONFLICT',
          message: `Unique constraint failed on: ${fields}`,
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: 'Record not found',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'FOREIGN_KEY_VIOLATION',
          message: 'Foreign key constraint failed',
        };
      default:
        // Raw PostgreSQL errors surface here via the driver adapter.
        // 23P01 = exclusion violation (booking overlap constraint),
        // 23505 = unique violation (e.g. one-active-allocation index).
        if (this.pgCode(exception) === '23P01') {
          return {
            statusCode: HttpStatus.CONFLICT,
            errorCode: 'BOOKING_OVERLAP',
            message: 'The requested time slot overlaps an existing booking',
          };
        }
        if (this.pgCode(exception) === '23505') {
          return {
            statusCode: HttpStatus.CONFLICT,
            errorCode: 'ALLOCATION_CONFLICT',
            message: 'The asset is already allocated',
          };
        }
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'DATABASE_ERROR',
          message: `Database error: ${exception.message}`,
        };
    }
  }

  /** Extract the underlying PostgreSQL SQLSTATE code, when present. */
  private pgCode(
    exception: Prisma.PrismaClientKnownRequestError,
  ): string | undefined {
    const meta = exception.meta as { code?: string } | undefined;
    return meta?.code;
  }

  private mapStatusCodeToErrorCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHENTICATED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
