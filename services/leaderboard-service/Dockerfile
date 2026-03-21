FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/leaderboard-service ./services/leaderboard-service

RUN npm ci --workspace=@game-backend/leaderboard-service --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/leaderboard-service

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/leaderboard-service/package.json ./services/leaderboard-service/package.json

RUN npm ci --workspace=@game-backend/leaderboard-service --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/leaderboard-service/dist ./services/leaderboard-service/dist

WORKDIR /app/services/leaderboard-service

EXPOSE 3003

CMD ["node", "dist/index.js"]
