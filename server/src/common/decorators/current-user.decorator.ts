import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../types/authenticated-request';

/**
 * Injects the authenticated user, or a single property of it when a key is
 * passed, e.g. `@CurrentUser('id') userId: string`.
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return data ? request.user[data] : request.user;
  },
);
