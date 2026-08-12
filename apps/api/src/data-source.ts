import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

/**
 * Standalone DataSource для TypeORM CLI (migration:generate / run / revert).
 *
 * Приложение (app.module) конфигурирует TypeORM через NestJS-фабрику и в проде
 * прогоняет миграции само (migrationsRun). Этот файл нужен ТОЛЬКО для CLI —
 * генерации и локального прогона миграций. Он читает тот же DATABASE_URL.
 *
 * Сущности и миграции подключаются глобом, чтобы список не приходилось
 * держать в двух местах (в app.module он статический ради tree-shaking).
 */
dotenv.config({ path: ['.env.local', '.env'] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан — CLI миграций не сможет подключиться к БД');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
});
