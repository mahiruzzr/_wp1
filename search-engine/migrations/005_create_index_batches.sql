CREATE TABLE IF NOT EXISTS index_batches (
    id          SERIAL PRIMARY KEY,
    started_at  TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP,
    pages_count INTEGER DEFAULT 0,
    status      VARCHAR(16) DEFAULT 'building'
                CHECK (status IN ('building', 'ready', 'failed'))
);
