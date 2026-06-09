CREATE TABLE IF NOT EXISTS pages (
    id            SERIAL PRIMARY KEY,
    url           TEXT UNIQUE NOT NULL,
    domain_id     INTEGER REFERENCES domains(id),
    title         TEXT,
    body          TEXT,
    html          TEXT,
    http_status   INTEGER,
    content_type  VARCHAR(128),
    content_length INTEGER,
    crawl_time    TIMESTAMPTZ DEFAULT NOW(),
    last_modified TIMESTAMPTZ,
    etag          VARCHAR(128),
    checksum      VARCHAR(64),
    fetch_count   INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pages_domain_id ON pages(domain_id);
CREATE INDEX IF NOT EXISTS idx_pages_crawl_time ON pages(crawl_time DESC);
CREATE INDEX IF NOT EXISTS idx_pages_checksum ON pages(checksum);
