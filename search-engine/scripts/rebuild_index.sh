#!/bin/bash
set -e
echo "Rebuilding index..."
cargo run -p indexer
echo "Index rebuild complete."
