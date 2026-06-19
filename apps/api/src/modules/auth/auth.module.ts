import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeachersModule } from "../teachers/teachers.module";
import { MailModule } from "../mail/mail.module";
import { PasswordReset } from "../schools/entities/password-reset.entity";
import { School } from "../schools/entities/school.entity";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    TeachersModule,
    PassportModule,
    MailModule,
    TypeOrmModule.forFeature([PasswordReset, School]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        // TODO: ADD_REFRESH_TOKEN — there is no refresh-token mechanism, so the access token
        // lifetime is kept long (1d) to avoid logging users out mid-session. Once refresh tokens
        // exist, shorten the access token to 15m–1h. Lifetime is env-overridable via JWT_EXPIRES_IN.
        signOptions: {
          expiresIn: (configService.get<string>("JWT_EXPIRES_IN") ?? "1d") as JwtSignOptions["expiresIn"],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
