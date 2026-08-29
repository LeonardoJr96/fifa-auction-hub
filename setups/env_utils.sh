#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_env_file() {
  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    echo "Arquivo .env não encontrado. Rode: ./install.sh generate-env" >&2
    exit 1
  fi
}

load_env() {
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
}
