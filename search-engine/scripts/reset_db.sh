#!/bin/bash
set -e
echo "Resetting database..."
dropdb -U search searchengine 2>/dev/null || true
createdb -U search searchengine
for f in migrations/*.sql; do
    psql -U search -d searchengine -f "$f"
done
echo "Database reset complete."
