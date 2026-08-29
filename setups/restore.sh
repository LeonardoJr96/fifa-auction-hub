#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/setups/compose_env.sh"

FILE="${1:-}"
if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Uso: ./install.sh restore <arquivo.sql.gz>" >&2
  exit 1
fi

require_env_file
load_env

echo "Restaurando $FILE ..."
gunzip -c "$FILE" | docker compose exec -T db psql -U "${POSTGRES_USER:-fifa}" -d "${POSTGRES_DB:-fifa_auction_hub}"
echo "OK"
