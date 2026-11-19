# AGENTS.md

Сервис бронирования звонков: TypeSpec-контракт, бекенд на Fastify, фронтенд на React + Vite + Mantine. Монорепозиторий на pnpm workspaces. Инструменты и задачи описаны в `mise.toml`.

## Команды

- `mise install` — поставить инструменты (Node, pnpm, hk, pitchfork) и зависимости.
- `mise run install` — зависимости и git-хуки (hk).
- `mise run gen` — TypeSpec → OpenAPI → типы бекенда и SDK фронтенда.
- `mise run dev` / `mise run stop` — запустить или остановить бекенд (:3000) и фронтенд (:5173) как daemons; `mise daemons status`, `mise daemons logs backend`.
- `mise run lint`, `mise run typecheck`, `mise run test`.
- `mise run check` — все проверки; эту же команду запускает CI.
- `docker build -t call-calendar . && docker run -p 8080:8080 call-calendar` — production-образ: бекенд отдаёт API на `/api` и собранный фронтенд на `/`. По этому `Dockerfile` в корне проверка Хекслета собирает приложение.

## Устройство

- `contract/main.tsp` — источник правды для API. Сначала меняйте контракт, потом `mise run gen`.
- `backend/` — Fastify; `src/app.ts` собирает приложение: API под префиксом `/api`, статика фронтенда из `STATIC_DIR`. Тесты в `test/` через `app.inject()`.
- `frontend/` — Vite + React + Mantine. API вызывается только через сгенерированный SDK (`src/client`), базовый путь `/api` задан в контракте (`@server`), в разработке Vite проксирует `/api` на бекенд.

## Правила

- Коммиты по Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `ci:` …); проверяет хук `commit-msg`.
- `backend/src/generated/` и `frontend/src/client/` генерируются и не хранятся в git — руками не править.
- TypeScript закреплён на 5.x: openapi-typescript и @hey-api/openapi-ts не работают с TypeScript 7.
- Новые проверки добавляйте в `mise run check`, а не отдельным шагом CI.
