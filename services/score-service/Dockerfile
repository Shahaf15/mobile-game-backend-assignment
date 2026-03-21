FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/score-service ./services/score-service

RUN npm ci --workspace=@game-backend/score-service --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/score-service

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/score-service/package.json ./services/score-service/package.json

RUN npm ci --workspace=@game-backend/score-service --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/score-service/dist ./services/score-service/dist

WORKDIR /app/services/score-service

EXPOSE 3002

CMD ["node", "dist/index.js"]
