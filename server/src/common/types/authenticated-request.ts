import type { Request } from 'express';
import type { Department, User } from '@prisma/client';

/**
 * The user object attached to the request by JwtStrategy.validate.
 * The password hash is stripped before it ever reaches a handler.
 */
export type AuthenticatedUser = Omit<User, 'passwordHash'> & {
  department: Department | null;
};

/**
 * Express request after JwtAuthGuard has authenticated it.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
