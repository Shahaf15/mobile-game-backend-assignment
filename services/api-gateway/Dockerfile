FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY services/api-gateway ./services/api-gateway

RUN npm ci --workspace=@game-backend/api-gateway --workspace=@game-backend/shared --include-workspace-root

RUN npm run build --workspace=@game-backend/shared
RUN npm run build --workspace=@game-backend/api-gateway

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/api-gateway/package.json ./services/api-gateway/package.json

RUN npm ci --workspace=@game-backend/api-gateway --workspace=@game-backend/shared --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist

WORKDIR /app/services/api-gateway

EXPOSE 3000

CMD ["node", "dist/index.js"]
