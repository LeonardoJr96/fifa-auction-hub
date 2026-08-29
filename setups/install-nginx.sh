#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Copie nginx/nginx.conf para o host e configure TLS conforme seu provedor."
echo "Este projeto expõe o edge em NGINX_PORT (padrão 8080) via docker compose."
echo "Para proxy reverso no host, use setups/nginx-proxy.sh"
