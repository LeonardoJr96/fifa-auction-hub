#!/usr/bin/env bash
# ==============================================================================
# Mega8Lance - FACTORY RESET
# Apaga dados persistidos e backups locais, depois sobe o stack de novo.
# Mantém .env e as configurações do Nginx (host + nginx/nginx.conf).
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose_env.sh
source "$SCRIPT_DIR/compose_env.sh"
compose_env_init || exit 1

FORCE=false
RUN_DEPLOY=true
WIPE_BACKUPS=true

C_CYAN="\033[0;36m"
C_YELLOW="\033[1;33m"
C_GREEN="\033[0;32m"
C_RED="\033[0;31m"
C_MAGENTA="\033[0;35m"
C_RESET="\033[0m"

log() {
  local message="$1"
  local level="${2:-INFO}"
  local color="${3:-$C_RESET}"
  local timestamp
  timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
  printf "%b[%s] [%s] %s%b\n" "$color" "$timestamp" "$level" "$message" "$C_RESET"
}

show_usage() {
  cat <<'EOF'
Usage: setups/reset.sh [--force] [--no-deploy] [--keep-backups]

Wipes persisted app data and local backups, then deploys from scratch.
Keeps .env and Nginx configuration (host proxy + nginx/nginx.conf).

Removed:
  - Docker containers from this compose project
  - Named volumes: pgdata (Postgres), media, static
  - Local files in backups/

Kept:
  - .env / backend/.env
  - nginx/nginx.conf
  - Host Nginx (/etc/nginx) and SSL certificates
  - Source code and images (rebuild happens on deploy)

Options:
  --force           Skip interactive confirmation.
  --no-deploy       Only wipe; do not run deploy afterwards.
  --keep-backups    Do not delete the local backups/ directory.
  -h, --help        Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=true
      ;;
    --no-deploy)
      RUN_DEPLOY=false
      ;;
    --keep-backups)
      WIPE_BACKUPS=false
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      printf 'Unknown reset option: %s\n\n' "$1" >&2
      show_usage >&2
      exit 1
      ;;
  esac
  shift
done

confirm_reset() {
  if [[ "$FORCE" == true ]]; then
    return 0
  fi

  printf '\n%bATENÇÃO: factory reset%b\n' "$C_RED" "$C_RESET"
  printf '  Apaga: banco Postgres, uploads (media), static, containers e backups locais.\n'
  printf '  Mantém: .env, nginx/nginx.conf, Nginx do host e certificados SSL.\n'
  printf '  Backups remotos (S3) NÃO são apagados.\n\n'
  read -r -p "Digite RESET para continuar: " confirmation
  if [[ "$confirmation" != "RESET" ]]; then
    log "Reset cancelled by user." "SKIP" "$C_YELLOW"
    exit 1
  fi
}

wipe_stack() {
  log "Stopping compose stack and removing named volumes..." "WIPE" "$C_MAGENTA"
  docker_compose down --volumes --remove-orphans
}

wipe_local_backups() {
  local backups_dir="$COMPOSE_PROJECT_ROOT/backups"

  if [[ "$WIPE_BACKUPS" != true ]]; then
    log "Keeping local backups (--keep-backups)." "SKIP" "$C_YELLOW"
    return 0
  fi

  if [[ -d "$backups_dir" ]]; then
    log "Removing local backups at $backups_dir" "WIPE" "$C_MAGENTA"
    rm -rf "$backups_dir"
  else
    log "No local backups/ directory found." "SKIP" "$C_YELLOW"
  fi
}

confirm_reset

log "Starting factory reset..." "START" "$C_YELLOW"
log "Project root: $COMPOSE_PROJECT_ROOT" "INFO" "$C_CYAN"

wipe_stack
wipe_local_backups

log "Persisted data wiped. Nginx config and .env were left untouched." "OK" "$C_GREEN"

if [[ "$RUN_DEPLOY" != true ]]; then
  log "Skipping deploy (--no-deploy). Start later with: ./install.sh deploy" "SKIP" "$C_YELLOW"
  exit 0
fi

log "Redeploying from a clean database..." "START" "$C_CYAN"
bash "$SCRIPT_DIR/deploy.sh"
log "After first boot, create an admin with:" "INFO" "$C_CYAN"
log "  docker exec -it mega8lance_backend python manage.py createsuperuser" "INFO" "$C_CYAN"
