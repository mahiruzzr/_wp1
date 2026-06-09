# Search Engine

Search engine built with Rust (Actix-web + Tantivy) + Next.js + PostgreSQL.

## Quick Start

```bash
# Start PostgreSQL and services
docker compose up -d

# Build and run API
cargo build --workspace
cargo run -p api-server

# Build index
cargo run -p indexer

# Crawl some pages
cargo run -p crawler https://example.com

# Frontend
cd frontend && npm install && npm run dev
```

## Architecture

- `crates/api` — Actix-web API server (search, stats)
- `crates/crawler` — Web crawler worker
- `crates/indexer` — Tantivy full-text index builder
- `crates/common` — Shared types, DB pool, config
- `frontend/` — Next.js 14 search UI
- `migrations/` — PostgreSQL DDL

## API

```
POST /api/v1/search   — Full-text search
GET  /api/v1/stats    — Crawl statistics
GET  /api/v1/index/status — Index status
```
