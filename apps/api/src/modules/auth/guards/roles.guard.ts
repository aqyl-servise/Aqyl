import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../teachers/entities/teacher.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest<{ user: { role: UserRole; isClassTeacher?: boolean } }>();
    if (requiredRoles.includes(user?.role)) return true;
    // class_teacher is stored as role='teacher' + isClassTeacher=true in DB/JWT,
    // not as a separate role value. Map the flag to the virtual role here.
    if (user?.isClassTeacher && requiredRoles.includes("class_teacher")) return true;
    return false;
  }
}
