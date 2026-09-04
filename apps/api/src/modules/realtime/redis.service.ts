import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

/**
 * Подключение к Redis для живого квиза.
 *
 * Состояние сессии держим здесь, а не в памяти процесса: выкладка
 * перезапускает процессы, и урок посреди квиза оборвался бы всему классу.
 * В Redis он переживает перезапуск — ученики просто переподключаются.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    this.client = new Redis(url, {
      // Реалтайм не должен ждать вечно: лучше быстро отдать ошибку и дать
      // клиенту переподключиться, чем держать зависший запрос.
      maxRetriesPerRequest: 3,
      connectTimeout: 3000,
      lazyConnect: false,
    });

    this.client.on("error", (err) => {
      // Не роняем процесс: ioredis переподключается сам, а падение шлюза
      // выбросило бы из урока весь класс.
      this.logger.error(`Redis: ${err.message}`);
    });
    this.client.on("ready", () => this.logger.log(`Redis подключён: ${url}`));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  /** Жив ли Redis — для проверки состояния сервиса. */
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}
