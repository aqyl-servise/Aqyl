import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SecurityAuditLog } from "../modules/schools/entities/security-audit-log.entity";
import { SKIP_ISOLATION_KEY } from "./skip-isolation.decorator";

@Injectable()
export class SchoolIsolationGuard implements CanActivate {
  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditRepo: Repository<SecurityAuditLog>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipIsolation = this.reflector.getAllAndOverride<boolean>(SKIP_ISOLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipIsolation) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return true;

    const publicPaths = ["/auth/", "/health"];
    if (publicPaths.some((p) => request.url.startsWith(p))) return true;

    if (user.role === "admin" && !user.schoolId) {
      const targetSchoolId = this.extractSchoolId(request);
      if (targetSchoolId) {
        this.auditRepo.save({
          eventType: "admin_cross_school_access",
          userId: user.sub,
          schoolId: targetSchoolId,
          ipAddress: request.ip,
          endpoint: request.url,
          requestMethod: request.method,
          details: { adminId: user.sub },
        }).catch(() => {});
      }
      return true;
    }

    const requestedSchoolId = this.extractSchoolId(request);

    if (requestedSchoolId && user.schoolId && requestedSchoolId !== user.schoolId) {
      this.auditRepo.save({
        eventType: "isolation_violation_attempt",
        userId: user.sub,
        schoolId: user.schoolId,
        ipAddress: request.ip,
        endpoint: request.url,
        requestMethod: request.method,
        details: {
          userSchoolId: user.schoolId,
          requestedSchoolId,
          role: user.role,
        },
      }).catch(() => {});

      throw new ForbiddenException("Нет доступа к данным этой школы");
    }

    return true;
  }

  private extractSchoolId(request: any): string | null {
    return (
      request.params?.schoolId ??
      request.params?.school_id ??
      request.query?.schoolId ??
      request.query?.school_id ??
      request.body?.schoolId ??
      request.body?.school_id ??
      null
    );
  }
}
