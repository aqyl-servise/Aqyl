# Aqyl

Генератор учебных материалов для учителей Казахстана: планы уроков (КСП) по
стандартам Министерства просвещения РК, задания, раздаточные и оценочные
материалы, презентации.

Прод: **https://aqyl-service.kz**

## Стек

- `apps/api` — NestJS + TypeORM + PostgreSQL
- `apps/web` — Next.js 16 (App Router) + React 19
- Монорепозиторий на npm workspaces
- Авторизация — JWT, письма — SMTP, оплата — Kaspi
- AI — Anthropic SDK: Sonnet (`claude-sonnet-4-6`) для генерации содержания,
  Haiku (`claude-haiku-4-5-20251001`) для лёгких задач. Список в
  `apps/api/src/config/ai-models.ts`, цены — `ai-pricing.ts`.

Две воронки: **B2C** (учитель платит сам, подписка) и **B2G** (доступ даёт
школа по договору). Разделяются полем `registrationSource` у учителя.

---

## Локальная разработка

```bash
# 1. PostgreSQL для разработки.
# Имя контейнера намеренно отличается от боевого (aqyl-postgres),
# порт привязан к 127.0.0.1 — наружу база не выставляется.
docker run -d --name aqyl-postgres-dev \
  -e POSTGRES_DB=aqyl -e POSTGRES_USER=aqyl -e POSTGRES_PASSWORD=aqyl_dev \
  -p 127.0.0.1:5432:5432 postgres:16-alpine

# 2. Окружение
cp apps/api/.env.example apps/api/.env
# Заполнить DATABASE_URL=postgres://aqyl:aqyl_dev@localhost:5432/aqyl и остальное.
# Пароль выше — только для локальной машины, боевые значения живут на сервере.

cp apps/web/.env.local.example apps/web/.env.local
# Оставить NEXT_PUBLIC_API_URL=http://localhost:4000

# 3. Зависимости — ОДИН раз в корне, а не по приложениям:
# это npm workspaces, per-app install не доставит часть пакетов.
npm install

# 4. Запуск
npm run dev:api   # API: http://localhost:4000
npm run dev:web   # Web: http://localhost:3000
```

Первый запуск API создаёт единственный аккаунт администратора `admin@aqyl.kz`.
Пароль берётся из `ADMIN_PASSWORD`; если переменная не задана — генерируется
случайный и печатается в лог один раз. Тестовые данные не создаются.

## Переменные окружения

Полные списки с комментариями — в `apps/api/.env.example` и
`apps/web/.env.local.example`. Ключевое:

| Переменная | Где | Назначение |
|---|---|---|
| `DATABASE_URL` | api | Строка подключения к PostgreSQL |
| `JWT_SECRET` | api + web | Подпись токенов. Значения обязаны совпадать |
| `ANTHROPIC_API_KEY` | api | Ключ Anthropic |
| `FRONTEND_URL` | api | Разрешённые origin для CORS, через запятую |
| `SMTP_*` | api | Отправка писем |
| `KASPI_*` | api | Приём платежей |
| `ADMIN_PASSWORD` | api | Пароль стартового администратора |
| `NEXT_PUBLIC_API_URL` | web | Адрес API |

## Схема базы

Схему ведут **миграции TypeORM**, ручной DDL не нужен. На проде
`DB_SYNCHRONIZE=false` и `migrationsRun` — незапущенные миграции применяются
автоматически при рестарте API.

```bash
cd apps/api
npm run migration:generate -- src/migrations/ИмяИзменения   # нужен доступ к БД
npm run migration:show                                      # что применено
npm run migration:revert                                    # откатить последнюю
```

Ограничение: базовая миграция покрывает дельту среза 2, полного baseline всей
схемы нет — чистая база бутстрапится `synchronize` или дампом.

---

## Деплой

Прод — собственный VPS (Ubuntu, PM2, nginx, PostgreSQL в Docker), **не Vercel
и не Railway**. Деплой одной командой из корня репозитория:

```bash
python deploy.py
```

Скрипт заходит по SSH-ключу (без паролей в коде) и делает:

1. `git fetch + reset --hard origin/main` — сервер точно соответствует `main`;
2. `npm install --legacy-peer-deps` один раз в корне воркспейса;
3. `npm run build` для api и web — **если сборка падает, процессы не
   перезапускаются и прод остаётся на старой версии**;
4. `pm2 restart aqyl-api && aqyl-web`;
5. смоук: API отвечает 401 (жив), web — 200.

Настройки берутся из окружения, значения по умолчанию — текущий прод:
`AQYL_HOST` (77.67.8.115), `AQYL_USER` (root), `AQYL_SSH_KEY`
(`~/.ssh/aqyl_deploy`). Обычно переопределять ничего не нужно.

### Что на сервере вручную

Не воспроизводится из репозитория, при пересоздании сервера нужно повторить:

- **Chrome для Puppeteer** (PDF-раздатки) — системные библиотеки Chromium и сам
  Chrome в `/root/.cache/puppeteer`. Штатный загрузчик puppeteer на этом сервере
  флапает, поэтому Chrome ставился вручную, а деплой идёт с
  `PUPPETEER_SKIP_DOWNLOAD=true`.
- **nginx и ufw** — разовая настройка, скрипт деплоя их не трогает.
- **`.env`-файлы** — лежат на сервере, в git их нет и `reset --hard` их не задевает.

### База на проде

```bash
docker exec -it aqyl-postgres psql -U aqyl -d aqyl
```

Учитывать типы колонок при джойнах: `lessons.id` — `uuid`, а
`lesson_handouts.lessonId`, `subscriptions.teacherId`, `lessons.userId` —
`varchar`, поэтому нужны приведения вида `l.id::text = h."lessonId"`.

---

## Бесплатный доступ

Пробный доступ меряется **комплектами материалов, а не днями**: 5 полных
комплектов при первой регистрации (оферта, п. 4.1). Комплект расходуется при
запуске генерации плана урока; черновики лимит не тратят, а раздатки и
презентация к уже начатому уроку остаются доступны и после исчерпания лимита.
Оплаченная подписка снимает ограничение полностью.

Константа — `TRIAL_LESSON_LIMIT` в `apps/api/src/modules/billing/subscription.service.ts`.

## Юридические документы

Тексты оферты, политики конфиденциальности и согласия лежат в
`apps/web/lib/legal-docs.ts` и публикуются на `/terms`, `/privacy`, `/consent`
плюс страницы архива редакций. При изменении условий — поднимать номер
редакции и добавлять запись в `revisions`, старый текст в архив. Пункт 13.2
оферты требует уведомлять пользователей за 15 дней об изменениях, затрагивающих
стоимость или объём предоставляемых прав.

---

## CI

GitHub Actions собирает проект на каждый PR и push в `main`
(`.github/workflows/ci.yml`). Автодеплоя из CI нет — прод обновляется вручную
командой `python deploy.py`.
