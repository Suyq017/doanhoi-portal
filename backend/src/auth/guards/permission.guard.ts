import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesService } from "../../roles/roles.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId =
      request.params.organizationId || request.body?.organizationId;

    this.logger.log(
      `Checking permissions for ${request.method} ${request.url} | user=${user?.id || "anonymous"} | org=${organizationId || "none"} | required=${requiredPermissions.join(", ")}`,
    );

    if (!user) {
      this.logger.warn(
        `Rejecting unauthenticated request for ${request.method} ${request.url}`,
      );
      throw new ForbiddenException("User not authenticated");
    }

    // Check if user has ANY of the required permissions (OR logic)
    // This allows multiple permissions where having at least one grants access
    let hasAnyPermission = false;
    const missingPermissions = [];

    try {
      for (const permission of requiredPermissions) {
        const hasPermission = await this.rolesService.hasPermission(
          user.id,
          permission,
          organizationId,
        );

        if (hasPermission) {
          hasAnyPermission = true;
          break; // Found one permission, grant access
        } else {
          missingPermissions.push(permission);
        }
      }

      if (!hasAnyPermission) {
        this.logger.warn(
          `Permission denied for user=${user.id} on ${request.method} ${request.url} | required=${requiredPermissions.join(" OR ")}`,
        );
        throw new ForbiddenException(
          `Permission denied. Requires one of: ${requiredPermissions.join(" OR ")}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Permission check failed for ${request.method} ${request.url} | user=${user.id} | org=${organizationId || "none"} | required=${requiredPermissions.join(", ")}`,
        error?.stack || error,
      );
      throw error;
    }
  }
}
