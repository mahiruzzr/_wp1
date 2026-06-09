CREATE TABLE IF NOT EXISTS domains (
    id          SERIAL PRIMARY KEY,
    domain      VARCHAR(255) UNIQUE NOT NULL,
    allowed     BOOLEAN DEFAULT true,
    robots_txt  TEXT,
    crawl_delay INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
