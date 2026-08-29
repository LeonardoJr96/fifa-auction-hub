#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/setups/env_utils.sh"

require_env_file
load_env

PORT="${NGINX_PORT:-8080}"
echo "Proxy do host → http://127.0.0.1:${PORT}"
echo "Exemplo Caddy:"
echo "  reverse_proxy 127.0.0.1:${PORT}"
echo "Exemplo nginx host:"
echo "  proxy_pass http://127.0.0.1:${PORT};"
