# Mobile Game Backend

A Node.js microservices architecture for a mobile game backend that manages player profiles, game scores, leaderboards, and client logs.

## Architecture

- **API Gateway** — Single entry point routing to internal services
- **Player Service** — CRUD operations for player profiles
- **Score Service** — Game score submission and queries
- **Leaderboard Service** — Aggregated leaderboard with Redis caching
- **Log Service** — Client log ingestion via RabbitMQ async pipeline
- **Log Worker** — Batch consumer writing logs to MongoDB

## Tech Stack

- **Runtime**: Node.js + Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Validation**: ArkType
- **Containerization**: Docker + docker-compose

## Getting Started

See setup instructions below (coming soon).
