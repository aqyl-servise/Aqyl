import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeachersModule } from "../teachers/teachers.module";
import { MailModule } from "../mail/mail.module";
import { PasswordReset } from "../schools/entities/password-reset.entity";
import { School } from "../schools/entities/school.entity";
import { Teacher } from "../teachers/entities/teacher.entity";
import { RefreshToken } from "./entities/refresh-token.entity";
import { EmailVerification } from "./entities/email-verification.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { B2cAuthService } from "./b2c-auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    TeachersModule,
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([PasswordReset, School, Teacher, RefreshToken, EmailVerification]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        // Default access-token lifetime (15m). B2G login() and generateTokens() pass an explicit
        // expiresIn, so this default is only a fallback. Refresh tokens (30d) are issued separately.
        signOptions: {
          expiresIn: (configService.get<string>("JWT_ACCESS_EXPIRES") ?? "15m") as JwtSignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, B2cAuthService, JwtStrategy],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
