#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/backend"

if [[ -f "$ROOT_DIR/.venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.venv/bin/activate"
fi

if [[ ! -f "$ROOT_DIR/setups/test-users.txt" ]]; then
  cp "$ROOT_DIR/setups/test-users.example.txt" "$ROOT_DIR/setups/test-users.txt"
fi

echo "Otimizando media (remove duplicatas)..."
python manage.py optimize_media

echo "Exportando jogadores e fotos para setups/seed/ ..."
python manage.py export_seed

echo "OK — seed pronto em setups/seed/"
du -sh "$ROOT_DIR/setups/seed" 2>/dev/null || true
