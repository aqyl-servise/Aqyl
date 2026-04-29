import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { SeedService } from "./seed.service";
import { SchoolSwitchInterceptor } from "./common/school-switch.interceptor";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());

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

  app.useStaticAssets(join(process.cwd(), "uploads"), { prefix: "/uploads" });

  const seedService = app.get(SeedService);
  await seedService.seed();
  await seedService.seedGifted();

  await app.listen(process.env.PORT ?? 4000);
  console.log(`API running on http://localhost:${process.env.PORT ?? 4000}`);
}

void bootstrap();
