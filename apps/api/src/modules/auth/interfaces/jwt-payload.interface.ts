import { UserRole } from "../../teachers/entities/teacher.entity";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
