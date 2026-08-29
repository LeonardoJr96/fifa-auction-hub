#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/setups/env_utils.sh"

usage() {
  cat <<'EOF'
FIFA Auction Hub — install.sh

Uso:
  ./install.sh                    menu interativo
  ./install.sh generate-env       gera .env na raiz
  ./install.sh deploy [--full-clean]
  ./install.sh backup
  ./install.sh restore <arquivo>
  ./install.sh export-seed
  ./install.sh install-nginx
  ./install.sh nginx-proxy
EOF
}

menu() {
  echo "=== FIFA Auction Hub ==="
  echo "1) generate-env"
  echo "2) deploy"
  echo "3) backup"
  echo "4) restore"
  echo "5) install-nginx"
  echo "6) nginx-proxy"
  echo "7) export-seed"
  read -r -p "Opção: " choice
  case "$choice" in
    1) bash setups/generate-env.sh ;;
    2) bash setups/deploy.sh ;;
    3) bash setups/backup.sh ;;
    4) read -r -p "Arquivo de backup: " f; bash setups/restore.sh "$f" ;;
    5) bash setups/install-nginx.sh ;;
    6) bash setups/nginx-proxy.sh ;;
    7) bash setups/export-seed.sh ;;
    *) usage ;;
  esac
}

cmd="${1:-}"
case "$cmd" in
  "") menu ;;
  generate-env) bash setups/generate-env.sh ;;
  deploy) shift; bash setups/deploy.sh "$@" ;;
  backup) bash setups/backup.sh ;;
  restore) shift; bash setups/restore.sh "$@" ;;
  export-seed) bash setups/export-seed.sh ;;
  install-nginx) bash setups/install-nginx.sh ;;
  nginx-proxy) bash setups/nginx-proxy.sh ;;
  -h|--help|help) usage ;;
  *) echo "Comando desconhecido: $cmd" >&2; usage; exit 1 ;;
esac
