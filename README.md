# Mobile Game Backend

A TypeScript monorepo for a mobile game backend built with Node.js microservices. The system manages players, scores, leaderboards, and asynchronous client log ingestion.

## Architecture

```text
                                +-------------------+
                                |    API Gateway    |
                                |   localhost:3010  |
                                +---------+---------+
                                          |
                    +---------------------+---------------------+
                    |                     |                     |
          +---------v--------+   +--------v---------+   +------v-------+
          |  Player Service  |   |   Score Service  |   | Log Service  |
          |      :3001       |   |       :3002      |   |    :3004     |
          +---------+--------+   +--------+---------+   +------+-------+
                    |                     |                    |
                    |          +----------v---------+          |
                    |          | Leaderboard        |          |
                    |          | Service :3003      |          |
                    |          +----+----------+----+          |
                    |               |          |               |
          +---------v---------------v--+  +----v-+    +-------v-----+
          |           MongoDB          |  |Redis |    |  RabbitMQ   |
          |            :27017          |  | :6379|    |  Priority   |
          +----------------------------+  +------+    |    Queue    |
                                                      +------+------+
                                                             |
                                                   +---------v---------+
                                                   |   Log Worker x2   |
                                                   | batch writes logs |
                                                   +-------------------+
```

## Services

| Service | Port | Purpose |
| --- | --- | --- |
| API Gateway | 3010 externally, 3000 in-container | Reverse proxy and single public entry point |
| Player Service | 3001 | Player CRUD |
| Score Service | 3002 | Score submission and top scores |
| Leaderboard Service | 3003 | Aggregated leaderboard with Redis caching |
| Log Service | 3004 | Accepts client logs and publishes them to RabbitMQ |
| Log Worker | n/a | Consumes log messages and stores them in MongoDB |
| MongoDB | 27017 | Primary data store |
| RabbitMQ | 5672 / 15672 | Queue transport and management UI |
| Redis | 6379 (internal) | Leaderboard cache |

## Tech Stack

- Node.js 20
- TypeScript
- Express
- MongoDB
- Redis
- RabbitMQ
- ArkType
- Vitest
- Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ for local development

### Run with Docker

```bash
git clone https://github.com/Shahaf15/mobile-game-backend-assignment.git
cd mobile-game-backend-assignment
docker compose up --build
```

The API gateway will be available at `http://localhost:3010`.

### Run Locally

```bash
npm install
npm run build --workspace=@game-backend/shared
docker compose up mongodb redis rabbitmq -d
npm run dev --workspace=@game-backend/player-service
npm run dev --workspace=@game-backend/score-service
npm run dev --workspace=@game-backend/leaderboard-service
npm run dev --workspace=@game-backend/log-service
npm run dev --workspace=@game-backend/log-worker
npm run dev --workspace=@game-backend/api-gateway
```

When running locally, the gateway listens on `http://localhost:3000` unless `API_GATEWAY_PORT` is overridden.

## Testing

```bash
npm test
```

Coverage is also available:

```bash
npm run test:coverage
```

## API Endpoints

All public routes below are exposed through the API gateway.

### Players

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/players` | Create a player |
| GET | `/api/players/:playerId` | Fetch a player |
| PUT | `/api/players/:playerId` | Update `username` and/or `email` |
| DELETE | `/api/players/:playerId` | Delete a player |

Request body for create:

```json
{
  "username": "player1",
  "email": "player1@example.com",
  "displayName": "Player One"
}
```

### Scores

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/scores` | Submit a score |
| GET | `/api/scores/top?limit=10` | Get top scores (`limit` defaults to `10`) |

Request body:

```json
{
  "playerId": "<PLAYER_ID>",
  "score": 1500
}
```

### Leaderboard

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/players/leaderboard?page=1&limit=10` | Get a paginated leaderboard |

Notes:
- `page` defaults to `1`
- `limit` defaults to `10` and is capped at `100`

### Logs

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/logs` | Submit a client log asynchronously |

Request body:

```json
{
  "playerId": "<PLAYER_ID>",
  "logData": "Player completed level 5",
  "level": "info",
  "action": "level_complete",
  "metadata": {
    "levelNumber": 5
  }
}
```

## Example Requests

```bash
curl -X POST http://localhost:3010/api/players \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","email":"player1@example.com","displayName":"Player One"}'
```

```bash
curl -X POST http://localhost:3010/api/scores \
  -H "Content-Type: application/json" \
  -d '{"playerId":"<PLAYER_ID>","score":1500}'
```

```bash
curl "http://localhost:3010/api/players/leaderboard?page=1&limit=10"
```

```bash
curl -X POST http://localhost:3010/api/logs \
  -H "Content-Type: application/json" \
  -d '{"playerId":"<PLAYER_ID>","logData":"Player completed level 5","level":"info","action":"level_complete"}'
```

## Health Checks

Each HTTP service exposes `GET /health`:

- API Gateway: `http://localhost:3010/health` when running through Docker
- Player Service: `/health`
- Score Service: `/health`
- Leaderboard Service: `/health`
- Log Service: `/health`

## Log Pipeline

```text
Client -> POST /api/logs -> Log Service -> RabbitMQ -> Log Worker -> MongoDB
```

Current implementation details:

- RabbitMQ uses a durable priority queue with `x-max-priority: 10`
- Log priority is derived from level (`debug`, `info`, `warn`, `error`, `fatal`)
- Workers batch writes using configurable `BATCH_SIZE` and `BATCH_TIMEOUT_MS`
- A token-bucket rate limiter and semaphore protect MongoDB from bursts
- Stored logs expire automatically after 30 days via a TTL index
- The Docker Compose setup currently starts two worker containers: `log-worker` and `log-worker-2`

## Design Notes

- `@game-backend/shared` contains shared schemas, types, middleware, and MongoDB/logger utilities
- Leaderboard responses are cached in Redis with `LEADERBOARD_CACHE_TTL`
- Services are independently buildable and deployable, while sharing common runtime contracts through npm workspaces

## Project Structure

```text
packages/
  shared/                  Shared types, schemas, middleware, and utilities
services/
  api-gateway/             Reverse proxy entry point
  player-service/          Player CRUD service
  score-service/           Score service
  leaderboard-service/     Leaderboard aggregation and cache
  log-service/             Log ingestion and RabbitMQ publisher
  log-worker/              RabbitMQ consumer and batch writer
postman/
  mobile-game-backend.postman_collection.json
```

## Postman

Import `postman/mobile-game-backend.postman_collection.json` into Postman to exercise the main API flows.
