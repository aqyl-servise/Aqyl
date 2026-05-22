import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Observable } from "rxjs";
import { SecurityAuditLog } from "../../modules/schools/entities/security-audit-log.entity";
import { SKIP_ISOLATION_KEY } from "../../guards/skip-isolation.decorator";
import { SKIP_SCHOOL_ISOLATION_KEY } from "../decorators/skip-school-isolation.decorator";

@Injectable()
export class SchoolIsolationInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(SecurityAuditLog)
    private readonly auditRepo: Repository<SecurityAuditLog>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Respect both @SkipIsolation() (existing) and @SkipSchoolIsolation() (new)
    const skip =
      this.reflector.getAllAndOverride<boolean>(SKIP_ISOLATION_KEY, [context.getHandler(), context.getClass()]) ||
      this.reflector.getAllAndOverride<boolean>(SKIP_SCHOOL_ISOLATION_KEY, [context.getHandler(), context.getClass()]);
    if (skip) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user yet (unauthenticated routes — public endpoints) → pass through
    if (!user) return next.handle();

    // Global admin without a schoolId may access any school — just audit and allow
    if (user.role === "admin" && !user.schoolId) {
      const targetSchoolId = this.extractSchoolId(request);
      if (targetSchoolId) {
        this.auditRepo.save({
          eventType: "admin_cross_school_access",
          userId: user.id ?? user.sub,
          schoolId: targetSchoolId,
          ipAddress: request.ip,
          endpoint: request.url,
          requestMethod: request.method,
          details: { adminId: user.id ?? user.sub },
        }).catch(() => {});
      }
      return next.handle();
    }

    const requestedSchoolId = this.extractSchoolId(request);

    if (requestedSchoolId && user.schoolId && requestedSchoolId !== user.schoolId) {
      this.auditRepo.save({
        eventType: "isolation_violation_attempt",
        userId: user.id ?? user.sub,
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

    return next.handle();
  }

  private extractSchoolId(request: Record<string, any>): string | null {
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
