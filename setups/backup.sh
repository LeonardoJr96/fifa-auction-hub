#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/setups/compose_env.sh"

require_env_file
load_env

BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/db_${STAMP}.sql.gz"

echo "Backup → $OUT"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-fifa}" "${POSTGRES_DB:-fifa_auction_hub}" | gzip > "$OUT"
echo "OK"
