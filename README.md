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

- **Docker & Docker Compose** (for containerized deployment)
- **Node.js 20+** (for local development only)
- **npm 10+** (comes with Node.js)

### Option 1: Run with Docker (Recommended for testing)

This is the simplest way to get the entire stack running. All services, databases, and message queues start automatically.

```bash
# Clone the repository
git clone https://github.com/Shahaf15/mobile-game-backend-assignment.git
cd mobile-game-backend-assignment

# Start all services
docker compose up --build
```

Wait for all containers to be healthy (you should see "healthy" status for MongoDB, RabbitMQ, and Redis).

**Access points:**
- **API Gateway**: http://localhost:3010
- **RabbitMQ Management UI**: http://localhost:15672 (guest/guest)
  - Monitor queue depth, message counts, and worker connections in real-time
- **MongoDB**: localhost:27017 (if you want to inspect data directly)

The stack is ready when you see:
```
api-gateway_1  | API Gateway started
log-worker_1   | Log worker started and consuming messages
```

### Option 2: Run Locally (For development)

Run the infrastructure (MongoDB, Redis, RabbitMQ) in Docker, but services as Node processes for faster iteration.

**Step 1: Start infrastructure only**
```bash
# Clone and navigate to project
git clone https://github.com/Shahaf15/mobile-game-backend-assignment.git
cd mobile-game-backend-assignment

# Start databases and message queue
docker compose up mongodb redis rabbitmq -d
```

Wait for all to be healthy:
```bash
docker compose ps
# All three should show "healthy" status
```

**Step 2: Install dependencies and build shared package**
```bash
npm install
npm run build --workspace=@game-backend/shared
```

**Step 3: Start each service in separate terminals**

Terminal 1 — Player Service:
```bash
npm run dev --workspace=@game-backend/player-service
# Listening on :3001
```

Terminal 2 — Score Service:
```bash
npm run dev --workspace=@game-backend/score-service
# Listening on :3002
```

Terminal 3 — Leaderboard Service:
```bash
npm run dev --workspace=@game-backend/leaderboard-service
# Listening on :3003
```

Terminal 4 — Log Service:
```bash
npm run dev --workspace=@game-backend/log-service
# Listening on :3004
```

Terminal 5 — Log Worker:
```bash
npm run dev --workspace=@game-backend/log-worker
# Consuming from RabbitMQ
```

Terminal 6 — API Gateway:
```bash
npm run dev --workspace=@game-backend/api-gateway
# API Gateway started on :3000
```

Once all start successfully, the **API Gateway** listens on http://localhost:3000.

**Why separate terminals?** You can see logs from each service in real-time and restart individual services without affecting others.

### Verify the setup

```bash
# Check API Gateway is responding
curl http://localhost:3010/health  # or :3000 if running locally

# Response should be:
# {"status":"ok","service":"api-gateway"}
```

## Testing

Run all tests across all services:

```bash
npm test
```

This runs 74+ tests covering:
- Player CRUD operations
- Score submission and retrieval
- Leaderboard aggregation and pagination
- Log ingestion and RabbitMQ publishing
- Batch processing, rate limiting, and semaphore concurrency
- Input validation schemas

**With coverage report:**

```bash
npm run test:coverage
```

**Run tests in watch mode (for development):**

```bash
npm test -- --watch
```

All tests use in-memory MongoDB for isolation — no test fixtures or cleanup needed.

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

## Quick Start Workflow

After setup, here's a complete flow to test all services:

**1. Create a player**
```bash
PLAYER_ID=$(curl -s -X POST http://localhost:3010/api/players \
  -H "Content-Type: application/json" \
  -d '{
    "username":"player1",
    "email":"player1@example.com",
    "displayName":"Player One"
  }' | jq -r '.playerId')

echo "Created player: $PLAYER_ID"
```

**2. Submit some scores**
```bash
curl -X POST http://localhost:3010/api/scores \
  -H "Content-Type: application/json" \
  -d "{\"playerId\":\"$PLAYER_ID\",\"score\":1500}"

curl -X POST http://localhost:3010/api/scores \
  -H "Content-Type: application/json" \
  -d "{\"playerId\":\"$PLAYER_ID\",\"score\":2000}"

curl -X POST http://localhost:3010/api/scores \
  -H "Content-Type: application/json" \
  -d "{\"playerId\":\"$PLAYER_ID\",\"score\":1800}"
```

**3. Get top 10 scores**
```bash
curl http://localhost:3010/api/scores/top?limit=10 | jq
```

**4. Get the leaderboard**
```bash
curl "http://localhost:3010/api/players/leaderboard?page=1&limit=10" | jq
```

**5. Submit a log (async — returns 202 immediately)**
```bash
curl -X POST http://localhost:3010/api/logs \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\":\"$PLAYER_ID\",
    \"logData\":\"Player completed level 5\",
    \"level\":\"info\",
    \"action\":\"level_complete\",
    \"metadata\":{\"levelNumber\":5}
  }"
```

**6. Monitor the log worker in RabbitMQ UI**
- Open http://localhost:15672 (guest/guest)
- Click **Queues and Streams** → `logs.queue`
- Watch message count decrease as workers process logs

**7. Verify logs were stored**
```bash
# Connect to MongoDB and inspect logs
docker exec mobile-game-backend-assignment-mongodb-1 mongosh \
  --eval "db.logs.find({playerId: '$PLAYER_ID'}).pretty()" \
  game-backend
```

## Health Checks

Each HTTP service exposes a `GET /health` endpoint for monitoring:

```bash
# API Gateway
curl http://localhost:3010/health

# Direct service access (when running locally)
curl http://localhost:3001/health  # Player Service
curl http://localhost:3002/health  # Score Service
curl http://localhost:3003/health  # Leaderboard Service
curl http://localhost:3004/health  # Log Service
```

Expected response:
```json
{"status":"ok","service":"api-gateway"}
```

---

## Troubleshooting

**Port already in use**
```bash
# Find and stop the conflicting service
lsof -i :3010  # or :3001, :3002, etc.
kill -9 <PID>

# Or change ports in docker-compose.yml
```

**Container won't start: "connection refused"**
This means MongoDB/RabbitMQ wasn't ready. Docker Compose has health checks that prevent this, but if it happens:
```bash
docker compose down -v  # Remove volumes
docker compose up --build  # Start fresh
```

**Logs not appearing in MongoDB after posting**
Check the RabbitMQ UI at http://localhost:15672:
- Look at the `logs.queue` message count
- If messages are queued, the worker may be overloaded (check Docker logs: `docker compose logs log-worker`)
- If the queue is empty but logs aren't in DB, check worker logs for errors

**Test failures when running locally**
Make sure MongoDB is listening on port 27017:
```bash
docker compose ps  # All should show "healthy"
```

**"Cannot find module '@game-backend/shared'"**
You skipped the build step. Run:
```bash
npm install
npm run build --workspace=@game-backend/shared
```

## Data Flow & Pipelines

### Request Flow (Synchronous Services)

```
Client Request
    ↓
API Gateway (routes by path)
    ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
├→ POST /api/players → Player Service → MongoDB      │
├→ GET /api/players/:id → Player Service → MongoDB   │
├→ POST /api/scores → Score Service → MongoDB        │
├→ GET /api/scores/top → Score Service → MongoDB     │
├→ GET /api/players/leaderboard → Leaderboard        │
│     Service → MongoDB aggregation + Redis cache    │
│                                                     │
└─────────────────────────────────────────────────────┘
    ↓
Response to Client (synchronous, blocking)
```

### Log Pipeline (Asynchronous)

```
Client
  ↓
POST /api/logs
  ↓
Log Service
  ├─ Validate input (ArkType schema)
  ├─ Add level & timestamp if missing
  └─ Publish to RabbitMQ → Returns 202 Accepted ✓
       ↓
    [RabbitMQ Priority Queue]
    (durable, x-max-priority: 10)
       ↓
    ┌────────────────┐
    │ Log Worker x2  │ (competing consumers)
    └────────────────┘
         ↓
    Batch Accumulator (size=50, timeout=2s)
         ↓
    Token Bucket Rate Limiter (100 tokens, 20/sec refill)
         ↓
    Concurrency Semaphore (max 3 concurrent DB writes)
         ↓
    MongoDB insertMany (ordered: false)
         ↓
    TTL Index removes logs after 30 days
```

**Why asynchronous?** The client doesn't wait for the log to be written to the database. It gets an immediate 202 response, and the system processes logs in the background at a controlled rate.

### Leaderboard Caching

```
Client GET /api/players/leaderboard
    ↓
Check Redis cache key
  ├─ Cache HIT (< 60s old) → Return cached response ✓ (fast)
  └─ Cache MISS
      ├─ MongoDB aggregation pipeline:
      │  • Group scores by playerId, sum totalScore
      │  • Join with players collection
      │  • Paginate and rank results
      └─ Store in Redis (60s TTL)
      └─ Return response
```

**Trade-off:** Up to 60 seconds of stale data, but significantly reduces MongoDB load. For leaderboards in games, this is acceptable.

---

## Implementation Details

### RabbitMQ Queue Configuration

- **Exchange**: `logs.exchange` (direct, durable)
- **Queue**: `logs.queue` (durable with `x-max-priority: 10`)
- **Routing Key**: `log.ingest`
- **Message Persistence**: All messages written to disk (survives broker restart)
- **Priority Mapping**: `debug=1, info=3, warn=5, error=7, fatal=9`

### Worker Rate Limiting & Concurrency

The log worker uses **three layers of flow control**:

1. **RabbitMQ Prefetch (100)**: Consumer receives up to 100 unacknowledged messages
2. **Token Bucket Rate Limiter**: Max 20 writes/second sustained, burst up to 100
3. **Semaphore (max 3)**: Only 3 concurrent MongoDB operations at any time

This prevents:
- MongoDB connection pool exhaustion
- Write storms during traffic spikes
- Memory exhaustion from unbounded message queues

### Batch Processing

Messages are accumulated and flushed when:
- **Size trigger**: Buffer reaches 50 messages, OR
- **Time trigger**: 2 seconds elapse since the first message

Example: In low traffic (5 logs/sec), messages wait up to 2s before writing. In high traffic (1000 logs/sec), 50-message batches flush every 50ms.

### Stored logs expire automatically after 30 days via a TTL index

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
