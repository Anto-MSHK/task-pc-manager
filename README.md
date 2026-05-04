# PromoCode Manager

Fullstack приложение для управления промокодами с аналитикой в реальном времени.
Реализует **CQRS-архитектуру**: записи идут в MongoDB, все аналитические таблицы на фронтенде читают из ClickHouse. Redis отвечает за кэш, distributed lock и refresh-токены.

---

## Быстрый старт

```bash
# 1. Скопировать env-файл
cp .env.example .env

# 2. Поднять весь стек одной командой
docker compose --profile fullstack up --build -d
```

После сборки (~2-3 минуты):

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Swagger UI | http://localhost:3001/api/docs |
| ClickHouse HTTP | http://localhost:8124 |

> Таблицы ClickHouse создаются автоматически при старте бэкенда — ручного seed-скрипта не нужно.

---

## Локальная разработка (DBs в Docker, приложения нативно)

```bash
# 1. Поднять только базы данных
docker compose up -d

# 2. Backend (в отдельном терминале)
cd backend
cp .env.localdev.example .env   # или отредактировать .env вручную
npm install
npm run start:dev

# 3. Frontend (в отдельном терминале)
cd frontend
npm install
npm run dev
```

`.env.localdev.example` использует `localhost` вместо Docker-хостнеймов сервисов.

---

## Переменные окружения

Все переменные описаны в `.env.example`. Обязательные:

| Переменная | Описание |
|---|---|
| `MONGODB_URI` | URI MongoDB с replica set (`replicaSet=rs0` обязателен для транзакций) |
| `JWT_ACCESS_SECRET` | Секрет для подписи access-токенов |
| `REDIS_PASSWORD` | Пароль Redis (используется и в docker-compose) |

Остальные переменные имеют разумные значения по умолчанию.

---

## Технологический стек

| Слой | Технологии |
|------|-----------|
| **Backend** | NestJS · TypeScript · Mongoose · `@clickhouse/client` · ioredis |
| **Frontend** | React 18 · TypeScript · Ant Design + Pro Components · TanStack Query · Zustand · React Router |
| **Базы данных** | MongoDB 7 (replica set) · ClickHouse 24 · Redis 7 |
| **Инфраструктура** | Docker Compose · healthchecks на всех сервисах |

---

## Архитектура CQRS

```
┌─────────────────────────────────────────────────────────────────┐
│                         WRITE PATH                              │
│                                                                 │
│   Client  ──POST/PATCH──▶  NestJS  ──Mongoose──▶  MongoDB      │
│                               │                    (source of   │
│                               │                     truth)      │
│                               │                                 │
│                         Outbox event                            │
│                         (same TX)  ▼                            │
│                            outbox_events ──worker──▶ ClickHouse │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         READ PATH                               │
│                                                                 │
│   Client  ──GET /analytics/*──▶  NestJS ──▶  Redis (cache)     │
│                                                  │  HIT         │
│                                                  ▼             │
│                                         ClickHouse (MISS)      │
│                                    (GROUP BY · SUM · ORDER BY)  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data flow: создание заказа с промокодом

```
POST /orders
  └─▶ MongoDB: insert order (amount, userId)
  └─▶ outbox_events: insert {type: orders.upserted}  ← та же транзакция
  └─▶ Redis: invalidate analytics cache

POST /orders/:id/apply-promocode
  └─▶ Redis: acquire distributed lock (lock:apply-promo:{promoId}, TTL 5s)
  └─▶ MongoDB TX:
      ├─ findOneAndUpdate order ($exists: false — атомарно)
      ├─ insert promo_usage
      └─ insert 2 outbox_events (orders + promo_usages)
  └─▶ Redis: release lock
  └─▶ Redis: invalidate analytics cache

Outbox worker (polling):
  └─▶ читает pending события → INSERT INTO ClickHouse → mark processed
      (retry × 5 → dead letter queue при превышении)
```

---

## Таблицы ClickHouse

Все таблицы создаются автоматически через `CREATE TABLE IF NOT EXISTS` при инициализации `ClickhouseService`.

### `users` — ReplacingMergeTree(updatedAt)

```sql
id String, email String, name String, phone Nullable(String),
isActive UInt8, createdAt DateTime64(3,'UTC'), updatedAt DateTime64(3,'UTC')
```

`ReplacingMergeTree` позволяет переписывать строку при обновлении пользователя (смена имени, email, статуса) — дедупликация по `id`, побеждает версия с максимальным `updatedAt`.

### `promocodes` — ReplacingMergeTree(updatedAt)

```sql
id String, code String, discountPercent UInt8,
maxUsages Nullable(UInt32), maxUsagesPerUser Nullable(UInt32),
dateFrom Nullable(DateTime64), dateTo Nullable(DateTime64),
isActive UInt8, createdAt DateTime64, updatedAt DateTime64
```

То же что `users` — мутации (деактивация, изменение лимитов) переписывают строку.

### `orders` — ReplacingMergeTree(updatedAt)

```sql
id String, userId String, userName String, userEmail String,
promocodeId Nullable(String), promocodeCode Nullable(String),
amount Decimal(12,2), discountAmount Decimal(12,2), finalAmount Decimal(12,2),
createdAt DateTime64, updatedAt DateTime64
```

Денормализованы `userName` и `userEmail`, чтобы аналитика не ходила в MongoDB. При обновлении пользователя или промокода (`syncUserCascade` / `syncPromocodeCascade`) переинсертируются все связанные строки — `ReplacingMergeTree` дедуплицирует.

### `promo_usages` — MergeTree()

```sql
id String, promocodeId String, promocodeCode String,
userId String, userName String, userEmail String,
orderId String, discountAmount Decimal(12,2),
usedAt DateTime64, createdAt DateTime64
```

Append-only история — `MergeTree` без `ReplacingMergeTree`, так как каждый факт использования промокода неизменяем. Содержит `promocodeCode`, `userName`, `userEmail` — аналитика полностью автономна.

---

## Синхронизация MongoDB → ClickHouse

Используется паттерн **Transactional Outbox**:

1. При каждой мутации в MongoDB (create/update/deactivate) в той же транзакции создаётся запись `OutboxEvent` в коллекции `outbox_events`.
2. Фоновый воркер (`OutboxService`) с интервалом опрашивает необработанные события и записывает их в ClickHouse.
3. При ошибке — **retry до 5 раз** с экспоненциальной задержкой. После 5 неудач событие перемещается в **Dead Letter Queue** (`sync_failures`) и не блокирует обработку остальных.
4. После успешной записи в ClickHouse воркер **инвалидирует Redis-кэш** для затронутых namespace'ов (`users`, `promocodes`, `promo-usages`, `summary`, `series`).

Преимущества: событие гарантированно создаётся атомарно с мутацией — не может быть потери данных при сбое сети или рестарте сервиса.

Дополнительно к outbox, при обновлении сущностей используется **sync-on-write** (`syncUserCascade`, `syncPromocodeCascade`) — немедленный каскадный re-insert денормализованных данных в `orders` для поддержания консистентности имён и кодов.

---

## Redis: реализованные use-cases

| Use-case | Реализация |
|---|---|
| **Кэш аналитики** | Результаты запросов к ClickHouse кэшируются с TTL 60 с. Ключи: `analytics:{namespace}:{hash(params)}` |
| **Distributed lock** | При применении промокода: `SET lock:apply-promo:{promoId} {token} PX 5000 NX`. Освобождение через Lua-скрипт (атомарная проверка токена + DEL) |
| **Refresh-токены** | `SETEX refresh_token:{token} {ttl} {userId}`. Однократное использование — токен удаляется сразу после валидации |
| **Rate limiting** | Sliding window на `POST /orders/:id/apply-promocode`: не более 5 запросов в 10 секунд |

---

## Server-side операции в таблицах

Все аналитические таблицы реализуют **server-side пагинацию, сортировку и фильтрацию** через единый интерфейс `GET /analytics/{entity}`:

```
GET /analytics/users?current=1&pageSize=20&sortField=totalSpent&sortOrder=descend
                     &dateFrom=2026-01-01T00:00:00Z&dateTo=2026-12-31T23:59:59Z
                     &search=anna
```

На бэкенде параметры транслируются в ClickHouse-запрос с `LIMIT/OFFSET`, `ORDER BY` и `WHERE`. Пользовательские значения передаются через **query parameters** (`{param:Type}`), а не строковой интерполяцией — защита от SQL-инъекций.

На фронтенде hook `useAnalyticsTable` передаёт параметры ProTable в API и обрабатывает ответ `{ data, total, current, pageSize }`. Глобальный фильтр по датам хранится в Zustand-store и применяется ко всем таблицам одновременно. Доступны пресеты: **Сегодня · 7 дней · 30 дней · Произвольный диапазон**.

---

## API документация

Swagger UI доступен по адресу **http://localhost:3001/api/docs** (или порт из `BACKEND_HOST_PORT`).

Все endpoints задокументированы с:
- описаниями и примерами запросов/ответов
- схемами DTO
- bearer-авторизацией (кнопка Authorize)

---

## Тесты

```bash
cd backend
npm run test        # unit-тесты (Jest)
npm run test:cov    # с покрытием
```

Покрыты: `AuthService`, `OrdersService` (создание заказа, применение промокода, race condition), `OutboxService` (retry, DLQ), `ParseObjectIdPipe`, promocode validation edge-cases (истёкший срок, лимит = 0, неактивный).
