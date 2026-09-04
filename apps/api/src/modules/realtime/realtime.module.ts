import { Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { SessionService } from "./session.service";
import { QuizGateway } from "./quiz.gateway";

/**
 * Живой квиз, слой сессий (ТЗ 3.0).
 *
 * Модуль поднимается в двух местах: в основном API — ради SessionService,
 * чтобы учитель мог создать сессию обычным запросом; и в отдельном процессе
 * реального времени, где к нему добавляется шлюз. От базы не зависит вовсе:
 * состояние живёт в Redis.
 */
@Module({
  providers: [RedisService, SessionService, QuizGateway],
  exports: [RedisService, SessionService],
})
export class RealtimeModule {}

/** То же без шлюза — для основного API, которому сокеты не нужны. */
@Module({
  providers: [RedisService, SessionService],
  exports: [RedisService, SessionService],
})
export class SessionsModule {}
