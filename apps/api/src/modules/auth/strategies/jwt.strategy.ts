import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { TeachersService } from "../../teachers/teachers.service";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly teachersService: TeachersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") ?? "super-secret-change-me",
    });
  }

  async validate(payload: JwtPayload) {
    const teacher = await this.teachersService.findById(payload.sub);
    if (!teacher) return null;
    return {
      id: teacher.id,
      fullName: teacher.fullName,
      email: teacher.email,
      preferredLanguage: teacher.preferredLanguage,
      role: teacher.role,
      subject: teacher.subject,
    };
  }
}
