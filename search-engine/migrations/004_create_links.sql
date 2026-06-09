CREATE TABLE IF NOT EXISTS links (
    id            SERIAL PRIMARY KEY,
    source_url    TEXT NOT NULL,
    target_url    TEXT NOT NULL,
    anchor_text   TEXT,
    source_page_id INTEGER REFERENCES pages(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_url);
CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_url);
