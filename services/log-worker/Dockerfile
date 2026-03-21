FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/log-worker ./services/log-worker

RUN npm ci --workspace=@game-backend/log-worker --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/log-worker

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/log-worker/package.json ./services/log-worker/package.json

RUN npm ci --workspace=@game-backend/log-worker --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/log-worker/dist ./services/log-worker/dist

WORKDIR /app/services/log-worker

CMD ["node", "dist/index.js"]
