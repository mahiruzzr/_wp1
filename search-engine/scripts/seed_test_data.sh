#!/bin/bash
set -e
echo "Seeding test data..."
psql -U search -d searchengine -c "
INSERT INTO domains (domain) VALUES ('example.com') ON CONFLICT DO NOTHING;
INSERT INTO pages (url, domain_id, title, body, http_status, content_type)
VALUES
  ('https://example.com/page1', 1, 'Test Page 1', 'This is a test page about Rust programming and async systems.', 200, 'text/html'),
  ('https://example.com/page2', 1, 'Test Page 2', 'Rust is a systems programming language focused on safety and performance.', 200, 'text/html'),
  ('https://example.com/page3', 1, 'Search Engine Basics', 'A search engine uses inverted indexes and ranking algorithms.', 200, 'text/html');
"
echo "Test data seeded."
