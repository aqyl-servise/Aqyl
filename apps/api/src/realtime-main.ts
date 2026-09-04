import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { RealtimeModule } from "./modules/realtime/realtime.module";

/**
 * Отдельный процесс реального времени (ТЗ 3.0, раздел 7).
 *
 * Почему не в основном API: каждая выкладка перезапускает aqyl-api, и живи
 * квиз там же — любой деплой посреди урока обрывал бы игру всему классу.
 * Здесь перезапуск стоит одного переподключения: состояние сессии в Redis, а
 * клиент Socket.IO соединяется заново сам.
 *
 * Нагрузка тут ни при чём: генерация урока ждёт ответа Anthropic, а не
 * занимает процессор, и реалтайму почти не мешает.
 */
async function bootstrap() {
  const port = Number(process.env.REALTIME_PORT ?? 4001);

  // Без HTTP-маршрутов: этот процесс обслуживает только сокеты, а nginx шлёт
  // сюда исключительно /socket.io/.
  const app = await NestFactory.create(RealtimeModule, { logger: ["log", "warn", "error"] });
  app.enableShutdownHooks();

  await app.listen(port, "127.0.0.1");
  new Logger("Realtime").log(`Живой квиз слушает 127.0.0.1:${port}`);
}

void bootstrap();
