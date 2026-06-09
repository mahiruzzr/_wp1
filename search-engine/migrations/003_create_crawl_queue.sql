CREATE TABLE IF NOT EXISTS crawl_queue (
    id          SERIAL PRIMARY KEY,
    url         TEXT NOT NULL,
    domain_id   INTEGER REFERENCES domains(id),
    depth       INTEGER DEFAULT 0,
    priority    INTEGER DEFAULT 0,
    status      VARCHAR(16) DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'done', 'error')),
    retries     INTEGER DEFAULT 0,
    error_msg   TEXT,
    enqueued_at TIMESTAMP DEFAULT NOW(),
    started_at  TIMESTAMP,
    finished_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_status ON crawl_queue(status);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_priority ON crawl_queue(priority DESC, enqueued_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_queue_url ON crawl_queue(url) WHERE status != 'done';
