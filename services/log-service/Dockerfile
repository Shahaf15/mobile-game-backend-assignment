FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/log-service ./services/log-service

RUN npm ci --workspace=@game-backend/log-service --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/log-service

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/log-service/package.json ./services/log-service/package.json

RUN npm ci --workspace=@game-backend/log-service --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/log-service/dist ./services/log-service/dist

WORKDIR /app/services/log-service

EXPOSE 3004

CMD ["node", "dist/index.js"]
