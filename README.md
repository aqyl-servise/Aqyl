# AQYL — Деплой на Vercel + Railway

Монорепозиторий: NestJS backend → Railway.app, Next.js frontend → Vercel.

## Стек

- `apps/api`: NestJS + TypeORM + PostgreSQL
- `apps/web`: Next.js App Router
- Auth: JWT
- AI: Anthropic SDK (claude-haiku-4-5-20251001)

---

## Backend (Railway)

### 1. Создай проект на railway.app

Зайди на [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.

### 2. Настрой сервис

- **Settings → Root Directory** → `apps/api`
- Railway найдёт `Procfile` и запустит: `node dist/main`

### 3. Добавь PostgreSQL

В проекте: **+ New → Database → Add PostgreSQL**

Railway автоматически добавит `DATABASE_URL` в переменные окружения сервиса.

### 4. Установи переменные окружения

**Service → Variables** (см. `apps/api/.env.example`):

| Переменная | Значение |
|---|---|
| `JWT_SECRET` | Случайная строка (минимум 32 символа) |
| `FRONTEND_URL` | `https://your-app.vercel.app` (заполни после деплоя Vercel) |
| `ANTHROPIC_API_KEY` | Ключ с [console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | `claude-haiku-4-5-20251001` |

> `DATABASE_URL` Railway добавляет автоматически при подключении PostgreSQL.

### 5. Задеплой

Railway деплоит при каждом push в `main`. URL: **Service → Settings → Domains → Generate Domain**.

---

## Frontend (Vercel)

### 1. Создай проект на vercel.com

Зайди на [vercel.com](https://vercel.com) → **New Project** → **Import** из GitHub.

### 2. Настрой проект

- **Root Directory**: `apps/web`
- **Framework Preset**: Next.js (определится автоматически)

### 3. Установи переменные окружения

**Project → Settings → Environment Variables**:

| Переменная | Значение |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL Railway backend (например `https://aqyl-api.up.railway.app`) |

### 4. Задеплой

Vercel деплоит при каждом push в `main`.

### 5. Обнови FRONTEND_URL на Railway

Вернись в Railway → **Service → Variables** → обнови `FRONTEND_URL` на реальный URL Vercel.

---

## Переменные окружения

### Backend — `apps/api/.env.example`

| Переменная | Описание | Обязательно |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Да (Railway добавляет автоматически) |
| `JWT_SECRET` | Секрет для JWT токенов | Да |
| `PORT` | Порт сервера | Нет (по умолчанию 4000) |
| `FRONTEND_URL` | URL фронтенда для CORS (через запятую для нескольких) | Да |
| `ANTHROPIC_API_KEY` | Ключ Anthropic API | Для AI функций |
| `ANTHROPIC_MODEL` | Модель Anthropic | Нет (по умолчанию claude-haiku-4-5-20251001) |

### Frontend — `apps/web/.env.production.example`

| Переменная | Описание | Обязательно |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL бэкенда на Railway | Да |

---

## Локальная разработка

```bash
# 1. Запусти PostgreSQL
docker-compose up -d

# 2. Настрой окружение
cp apps/api/.env.example apps/api/.env
# Заполни apps/api/.env (DATABASE_URL=postgres://aqyl:aqyl123@localhost:5432/aqyl и т.д.)

cp apps/web/.env.production.example apps/web/.env.local
# Оставь NEXT_PUBLIC_API_URL=http://localhost:4000

# 3. Установи зависимости
npm install

# 4. Запусти оба сервиса
npm run dev:api   # API: http://localhost:4000
npm run dev:web   # Web: http://localhost:3000
```

**Тестовые данные (после первого запуска):**
- Email: `teacher@aqyl.kz` / Пароль: `aqyl123`

---

## CI/CD

GitHub Actions запускает сборку при каждом PR и push в `main`.
Конфигурация: `.github/workflows/ci.yml`

Railway и Vercel деплоят автоматически через GitHub интеграцию при merge в `main`.
