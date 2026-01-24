import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    console.log(`[RolesGuard] Checking roles for user:`, user ? { id: user.id, role: user.role } : 'No user found');
    console.log(`[RolesGuard] Required roles:`, requiredRoles);

    if (!user || !user.role) {
      console.log('[RolesGuard] Access denied: No user or role found on request');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    console.log(`[RolesGuard] Authorization result: ${hasRole}`);
    return hasRole;
  }
}
