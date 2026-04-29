import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class SchoolSwitchInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { role?: string; schoolId?: string | null }; headers: Record<string, string> }>();
    const user = req.user;
    if (user?.role === "admin" && !user.schoolId) {
      const header = req.headers["x-school-id"];
      if (header && typeof header === "string" && header.trim()) {
        user.schoolId = header.trim();
      }
    }
    return next.handle();
  }
}
