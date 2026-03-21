FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/player-service ./services/player-service

RUN npm ci --workspace=@game-backend/player-service --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/player-service

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/player-service/package.json ./services/player-service/package.json

RUN npm ci --workspace=@game-backend/player-service --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/player-service/dist ./services/player-service/dist

WORKDIR /app/services/player-service

EXPOSE 3001

CMD ["node", "dist/index.js"]
