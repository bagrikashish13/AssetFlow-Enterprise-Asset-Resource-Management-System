import { IsEnum, NotEquals } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  @NotEquals(UserRole.ADMIN, {
    message: 'ADMIN role cannot be assigned via API',
  })
  role!: UserRole;
}
