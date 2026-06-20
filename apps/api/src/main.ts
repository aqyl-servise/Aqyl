import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as path from "path";
import * as fs from "fs";
import helmet from "helmet";
import compression from "compression";
import { AppModule } from "./app.module";
import { SeedService } from "./seed.service";
import { SchoolSwitchInterceptor } from "./common/school-switch.interceptor";

async function bootstrap() {
  // rawBody: true сохраняет сырое тело запроса (req.rawBody) рядом с распарсенным —
  // нужно для верификации HMAC-подписи Kaspi webhook по исходным байтам.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Behind Nginx: trust the first proxy hop so req.ip reflects the real client
  // (X-Forwarded-For). Without this, the IP-based ThrottlerGuard would see every
  // request as 127.0.0.1 and rate-limit all users collectively instead of per-client.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(compression());

  const allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-School-Id"],
  });

  app.useGlobalInterceptors(new SchoolSwitchInterceptor());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  const seedService = app.get(SeedService);
  await seedService.seed();
  await seedService.seedGifted();

  const logger = new Logger('Bootstrap');
  const promptsDir = path.join(process.cwd(), 'prompts');
  if (!fs.existsSync(promptsDir)) {
    logger.warn('prompts/ directory not found at ' + promptsDir);
  } else {
    logger.log('Prompts directory found at ' + promptsDir);
  }

  await app.listen(process.env.PORT ?? 4000);
  logger.log(`API running on http://localhost:${process.env.PORT ?? 4000}`);
}

void bootstrap();
