import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { SkipSchoolIsolation } from "../../common/decorators/skip-school-isolation.decorator";
import { ALL_TEACHER_ROLES } from "../../common/roles.constants";
import { BillingService } from "./billing.service";
import { KaspiService } from "./kaspi.service";
import { CreateSessionDto } from "./dto/create-session.dto";

interface ReqUser {
  user: { id: string; role: string; registrationSource?: string };
}

// B2C-учителя не привязаны к школе → пропускаем school-isolation на всём контроллере.
@SkipSchoolIsolation()
@Controller("billing")
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly kaspiService: KaspiService,
  ) {}

  @Post("create-session")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_TEACHER_ROLES)
  @Throttle({ medium: { limit: 10, ttl: 60_000 } })
  createSession(@Body() body: CreateSessionDto, @Req() req: ReqUser) {
    if (req.user.registrationSource !== "b2c") {
      throw new ForbiddenException("Оплата доступна только для B2C-учителей");
    }
    return this.billingService.createPaymentSession(req.user.id, body.months);
  }

  // ПУБЛИЧНЫЙ эндпоинт — Kaspi вызывает без JWT.
  // Всегда отвечаем 200 { received: true }, иначе Kaspi будет повторять доставку.
  @Post("webhook/kaspi")
  @HttpCode(200)
  async kaspiWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-kaspi-signature") signature: string,
  ) {
    try {
      // req.rawBody доступен благодаря NestFactory.create(..., { rawBody: true }).
      const bodyString = req.rawBody
        ? req.rawBody.toString("utf8")
        : JSON.stringify(req.body ?? {});
      this.logger.log(`Kaspi webhook received: ${bodyString}`);

      const isValid = this.kaspiService.verifyWebhookSignature(
        bodyString,
        signature,
      );
      if (!isValid) {
        this.logger.warn("Kaspi webhook: invalid signature — ignoring");
        // Подпись неверна — не обрабатываем, но возвращаем 200, чтобы не получать ретраи.
        return { received: true };
      }

      const payload = (
        req.rawBody ? JSON.parse(bodyString) : req.body
      ) as Record<string, unknown>;
      return await this.billingService.handleWebhook(payload);
    } catch (err) {
      this.logger.error(
        `Kaspi webhook processing failed: ${(err as Error).message}`,
      );
      return { received: true };
    }
  }

  @Get("subscription")
  @UseGuards(JwtAuthGuard)
  getSubscription(@Req() req: ReqUser) {
    return this.billingService.getSubscription(req.user.id);
  }

  @Get("payments")
  @UseGuards(JwtAuthGuard)
  getPayments(@Req() req: ReqUser) {
    return this.billingService.getPaymentHistory(req.user.id);
  }
}
