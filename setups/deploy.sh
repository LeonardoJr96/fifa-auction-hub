#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/setups/compose_env.sh"

FULL_CLEAN=false
for arg in "$@"; do
  if [[ "$arg" == "--full-clean" ]]; then
    FULL_CLEAN=true
  fi
done

require_env_file
load_env

cd "$ROOT_DIR"

if [[ ! -f "$ROOT_DIR/setups/seed/fifa_data.json.gz" ]]; then
  echo "Aviso: setups/seed/fifa_data.json.gz não encontrado."
  echo "Rode ./install.sh export-seed no ambiente local antes do primeiro deploy Docker."
fi

if [[ ! -f "$ROOT_DIR/setups/test-users.txt" ]]; then
  cp "$ROOT_DIR/setups/test-users.example.txt" "$ROOT_DIR/setups/test-users.txt"
fi

if $FULL_CLEAN; then
  echo "Removendo volumes e containers..."
  docker compose down -v --remove-orphans
fi

echo "Build e subida dos serviços..."
docker compose build
docker compose up -d

echo "Aguardando healthchecks..."
sleep 10
docker compose ps

echo "Deploy concluído. Acesse http://localhost:${NGINX_PORT:-8080}"
