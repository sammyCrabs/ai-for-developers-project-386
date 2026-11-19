# syntax=docker/dockerfile:1

FROM node:24.22.3-slim AS base
RUN npm install -g pnpm@12.21.0
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY contract/package.json contract/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @call-calendar/contract build \
 && pnpm --filter @call-calendar/backend gen \
 && pnpm --filter @call-calendar/frontend gen \
 && pnpm --filter @call-calendar/backend build \
 && pnpm --filter @call-calendar/frontend build

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    STATIC_DIR=/app/frontend/dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --prod --filter @call-calendar/backend
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
EXPOSE 8080
CMD ["node", "backend/dist/server.js"]
