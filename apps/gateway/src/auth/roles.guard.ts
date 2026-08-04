import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@fardeen/types';
import type { FardeenRequest } from '../common/http';
import { ROLES_KEY } from './roles.decorator';

/** RBAC — reads the role claim (set by JwtAuthGuard) against the route's @Roles metadata. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<FardeenRequest>();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Authentication required' });
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Insufficient role' });
    }
    return true;
  }
}
