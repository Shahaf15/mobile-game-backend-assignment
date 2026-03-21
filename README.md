# Mobile Game Backend

A Node.js microservices architecture for a mobile game backend that manages player profiles, game scores, leaderboards, and client logs with an async data pipeline.

## Architecture

```
                                ┌─────────────────────┐
                                │    API Gateway       │
                                │      :3000           │
                                └─────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
          ┌─────────▼──────┐   ┌─────────▼──────┐   ┌─────────▼──────┐
          │ Player Service │   │ Score Service   │   │  Log Service   │
          │     :3001      │   │     :3002       │   │     :3004      │
          └───────┬────────┘   └───────┬─────────┘   └───────┬────────┘
                  │                    │                      │
                  │            ┌───────▼─────────┐    ┌───────▼────────┐
                  │            │  Leaderboard    │    │   RabbitMQ     │
                  │            │  Service :3003  │    │  Priority Queue│
                  │            └──┬──────────┬───┘    └───────┬────────┘
                  │               │          │                │
          ┌───────▼───────────────▼──┐  ┌────▼────┐   ┌───────▼────────┐
          │       MongoDB            │  │  Redis  │   │  Log Worker(s) │
          │       :27017             │  │  :6379  │   │  (2 replicas)  │
          └──────────────────────────┘  └─────────┘   └───────┬────────┘
                                                              │
                                                      ┌───────▼────────┐
                                                      │    MongoDB     │
                                                      │  (batch write) │
                                                      └────────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Reverse proxy — single entry point |
| Player Service | 3001 | CRUD operations for player profiles |
| Score Service | 3002 | Game score submission and top scores |
| Leaderboard Service | 3003 | Aggregated leaderboard with Redis cache |
| Log Service | 3004 | Log ingestion → RabbitMQ publisher |
| Log Worker | — | RabbitMQ consumer → batch writes to MongoDB |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express.js |
| Language | TypeScript (strict mode) |
| Database | MongoDB 7 |
| Cache | Redis 7 |
| Message Queue | RabbitMQ 3 |
| Validation | ArkType |
| Containerization | Docker + docker-compose |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 20+ (for local development)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/Shahaf15/mobile-game-backend-assignment.git
cd mobile-game-backend-assignment

# Start all services
docker-compose up --build

# The API will be available at http://localhost:3000
```

### Run Locally (Development)

```bash
# Install dependencies
npm install

# Build shared package
npm run build --workspace=@game-backend/shared

# Start infrastructure (MongoDB, Redis, RabbitMQ)
docker-compose up mongodb redis rabbitmq -d

# Run services individually (in separate terminals)
npm run dev --workspace=@game-backend/player-service
npm run dev --workspace=@game-backend/score-service
npm run dev --workspace=@game-backend/leaderboard-service
npm run dev --workspace=@game-backend/log-service
npm run dev --workspace=@game-backend/log-worker
npm run dev --workspace=@game-backend/api-gateway
```

## API Endpoints

### Player Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/players` | Create a new player profile |
| GET | `/api/players/:playerId` | Get player by ID |
| PUT | `/api/players/:playerId` | Update player (username or email) |
| DELETE | `/api/players/:playerId` | Delete player |

### Game Scores

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scores` | Submit a game score |
| GET | `/api/scores/top` | Get top 10 highest scores |

### Leaderboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players/leaderboard?page=1&limit=10` | Paginated leaderboard by total score |

### Log Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/logs` | Submit client log (async via RabbitMQ) |

## API Examples

### Create Player
```bash
curl -X POST http://localhost:3000/api/players \
  -H "Content-Type: application/json" \
  -d '{"username": "player1", "email": "player1@example.com", "displayName": "Player One"}'
```

### Submit Score
```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
  -d '{"playerId": "<PLAYER_ID>", "score": 1500}'
```

### Get Leaderboard
```bash
curl http://localhost:3000/api/players/leaderboard?page=1&limit=10
```

### Submit Log
```bash
curl -X POST http://localhost:3000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"playerId": "<PLAYER_ID>", "logData": "Player completed level 5", "level": "info", "action": "level_complete"}'
```

## Log Pipeline

The log management system uses an async data pipeline for reliable, high-throughput log processing:

```
Client → POST /logs → Log Service → RabbitMQ (priority queue) → Log Worker(s) → MongoDB
```

### Key Mechanisms

1. **Priority Queue**: RabbitMQ queue declared with `x-max-priority: 10`. Log severity determines message priority (`fatal=9, error=7, warn=5, info=3, debug=1`). Critical logs are processed first.

2. **Batching**: Worker accumulates messages in a buffer. Flushes when buffer reaches `BATCH_SIZE` (50) or `BATCH_TIMEOUT` (2s) elapses. Uses `insertMany` for efficient MongoDB writes.

3. **Token Bucket Rate Limiter**: Controls DB write throughput. Tokens refill at a steady rate (`RATE_LIMIT_REFILL_RATE`). Each batch consumes tokens proportional to its size. Prevents bursts from overwhelming the database.

4. **Concurrency Control (Semaphore)**: Limits parallel DB write operations to `MAX_CONCURRENCY` (3). Prevents MongoDB connection pool exhaustion.

5. **Horizontal Scaling**: Multiple worker instances consume from the same queue (competing consumers pattern). Scale with `docker-compose up --scale log-worker=4`.

## Design Decisions

### Why RabbitMQ over Kafka?

- **Native priority queues**: RabbitMQ supports `x-max-priority` out of the box — no need to simulate with separate topics.
- **No replay needed**: Client logs are fire-and-forget. Kafka's durable replay is unnecessary overhead.
- **Simpler infrastructure**: RabbitMQ is a single container. Kafka requires Kafka + ZooKeeper/KRaft.
- **Manual ack + prefetch**: Maps directly to the concurrency control requirements.

### Why Redis for Leaderboard?

The leaderboard aggregation pipeline is expensive (grouping all scores, sorting, joining with players). Redis caching with a 60-second TTL reduces database load while keeping data reasonably fresh.

### Monorepo with npm Workspaces

Shared types, validation schemas, and middleware live in `@game-backend/shared`. This avoids duplication while keeping services independently deployable — each has its own Dockerfile and can be built/deployed separately.

## Scaling Considerations

### Horizontal Scaling
- All services are **stateless** — scale any service by adding more instances behind a load balancer.
- Log workers scale independently: `docker-compose up --scale log-worker=N`
- API Gateway can be fronted by nginx/HAProxy for load balancing.

### Database Scaling
- **MongoDB**: Use replica sets for read scaling and high availability. Shard the `scores` and `logs` collections by `playerId` for write distribution.
- **Redis**: Use Redis Cluster for cache distribution across nodes.

### Performance Optimizations
- **Indexes**: All query patterns have supporting MongoDB indexes.
- **TTL**: Logs auto-expire after 30 days to manage storage growth.
- **Connection pooling**: Mongoose default pool handles concurrent requests efficiently.
- **Prefetch tuning**: RabbitMQ prefetch count controls in-flight message limits per worker.

## Monitoring

- **RabbitMQ Management UI**: http://localhost:15672 (guest/guest) — monitor queue depth, message rates, consumers.
- **Health Checks**: Each service exposes `GET /health` for container orchestration.

## Project Structure

```
├── packages/
│   └── shared/                 # Shared types, schemas, middleware, utilities
├── services/
│   ├── api-gateway/            # Reverse proxy (:3000)
│   ├── player-service/         # Player CRUD (:3001)
│   ├── score-service/          # Score management (:3002)
│   ├── leaderboard-service/    # Leaderboard aggregation (:3003)
│   ├── log-service/            # Log ingestion (:3004)
│   └── log-worker/             # RabbitMQ consumer + batch writer
├── postman/                    # Postman API collection
├── docker-compose.yml
├── .env.example
└── tsconfig.base.json
```

## Postman Collection

Import `postman/mobile-game-backend.postman_collection.json` into Postman. The collection auto-captures the `playerId` from the Create Player response and uses it in subsequent requests.
