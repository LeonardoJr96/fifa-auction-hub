#!/usr/bin/env bash
################################################################################
# Gera/atualiza .env do Mega8Lance de forma interativa
################################################################################

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
EXAMPLE_FILE="${PROJECT_ROOT}/.env.example"

# shellcheck source=/dev/null
source "${SCRIPT_DIR}/env_utils.sh"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

ask_yes_no() {
  local prompt="$1"
  local default="${2:-n}"
  local answer
  if [[ "$default" == "y" ]]; then
    read -r -p "${prompt} [S/n]: " answer
    answer="${answer:-s}"
  else
    read -r -p "${prompt} [s/N]: " answer
    answer="${answer:-n}"
  fi
  [[ "$answer" =~ ^[sSyY]$ ]]
}

ask_value() {
  local prompt="$1"
  local default="${2:-}"
  local answer
  if [[ -n "$default" ]]; then
    read -r -p "${prompt} [${default}]: " answer
    echo "${answer:-$default}"
  else
    read -r -p "${prompt}: " answer
    echo "$answer"
  fi
}

generate_secret_key() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(50))
PY
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
    echo
    return
  fi
  echo "change-me-$(date +%s)"
}

generate_fernet_key() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY'
try:
    from cryptography.fernet import Fernet
    print(Fernet.generate_key().decode())
except Exception:
    import base64, os
    print(base64.urlsafe_b64encode(os.urandom(32)).decode())
PY
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'
    echo
    return
  fi
  echo ""
}

echo "========================================================="
echo "  Gerar .env — Mega8Lance"
echo "========================================================="
echo

if [[ -f "$ENV_FILE" ]]; then
  log_warning ".env já existe."
  if ! ask_yes_no "Sobrescrever / atualizar chaves sensíveis?" "n"; then
    log_info "Cancelado."
    exit 0
  fi
  backup="$(env_backup "$ENV_FILE")"
  log_info "Backup: $backup"
elif [[ -f "$EXAMPLE_FILE" ]]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  log_success "Criado a partir de .env.example"
else
  touch "$ENV_FILE"
fi

MODE="$(ask_value "Ambiente (dev/prod)" "dev")"
DOMAIN="$(ask_value "Domínio público (vazio = localhost)" "")"
DB_NAME="$(ask_value "DB_NAME" "$(env_get "$ENV_FILE" DB_NAME 2>/dev/null || echo lowbid)")"
DB_USER="$(ask_value "DB_USER" "$(env_get "$ENV_FILE" DB_USER 2>/dev/null || echo lowbid)")"
DB_PASSWORD="$(ask_value "DB_PASSWORD" "$(env_get "$ENV_FILE" DB_PASSWORD 2>/dev/null || echo lowbid)")"

SECRET_KEY="$(generate_secret_key)"
CPF_ENCRYPTION_KEY="$(generate_fernet_key)"
CPF_HASH_KEY="$(generate_secret_key | head -c 48)"

env_upsert "$ENV_FILE" "SECRET_KEY" "$SECRET_KEY"
env_upsert "$ENV_FILE" "CPF_ENCRYPTION_KEY" "$CPF_ENCRYPTION_KEY"
env_upsert "$ENV_FILE" "CPF_HASH_KEY" "$CPF_HASH_KEY"
env_upsert "$ENV_FILE" "DB_NAME" "$DB_NAME"
env_upsert "$ENV_FILE" "DB_USER" "$DB_USER"
env_upsert "$ENV_FILE" "DB_PASSWORD" "$DB_PASSWORD"
env_upsert "$ENV_FILE" "SYSTEM_WEBHOOK_TOKEN" "$(generate_secret_key | head -c 32)"
env_upsert "$ENV_FILE" "VITE_API_URL" "/api/v1"

if [[ "$MODE" == "prod" || "$MODE" == "production" ]]; then
  env_upsert "$ENV_FILE" "DEBUG" "False"
  env_upsert "$ENV_FILE" "COOKIE_SECURE" "True"
  env_upsert "$ENV_FILE" "DJANGO_SETTINGS_MODULE" "core.settings.production"
  env_upsert "$ENV_FILE" "DATABASE_URL" "postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"
  env_upsert "$ENV_FILE" "REDIS_URL" "redis://redis:6379/0"
  env_upsert "$ENV_FILE" "NGINX_PUBLISH_IP" "127.0.0.1"
  env_upsert "$ENV_FILE" "NGINX_PUBLISH_PORT" "8080"
else
  env_upsert "$ENV_FILE" "DEBUG" "True"
  env_upsert "$ENV_FILE" "COOKIE_SECURE" "False"
  env_upsert "$ENV_FILE" "DJANGO_SETTINGS_MODULE" "core.settings.development"
  env_upsert "$ENV_FILE" "DATABASE_URL" "sqlite:///db.sqlite3"
  env_upsert "$ENV_FILE" "REDIS_URL" "redis://127.0.0.1:6379/0"
fi

if [[ -n "$DOMAIN" ]]; then
  scheme="https"
  [[ "$MODE" == "dev" || "$MODE" == "development" ]] && scheme="http"
  origin="${scheme}://${DOMAIN}"
  env_upsert "$ENV_FILE" "ALLOWED_HOSTS" "${DOMAIN},www.${DOMAIN},localhost,127.0.0.1,backend,nginx"
  env_upsert "$ENV_FILE" "CORS_ALLOWED_ORIGINS" "${origin},https://www.${DOMAIN},http://www.${DOMAIN}"
  env_upsert "$ENV_FILE" "CSRF_TRUSTED_ORIGINS" "${origin},https://www.${DOMAIN},http://www.${DOMAIN}"
  env_upsert "$ENV_FILE" "FRONTEND_URL" "$origin"
  env_upsert "$ENV_FILE" "MERCADOPAGO_NOTIFICATION_URL" "${origin}/api/v1/system/webhooks/pix/"
  if [[ "$scheme" == "https" ]]; then
    env_upsert "$ENV_FILE" "SESSION_COOKIE_DOMAIN" ".${DOMAIN}"
  fi
else
  env_upsert "$ENV_FILE" "ALLOWED_HOSTS" "localhost,127.0.0.1,backend,nginx"
  env_upsert "$ENV_FILE" "CORS_ALLOWED_ORIGINS" "http://localhost:5173,http://127.0.0.1:5173,http://localhost"
  env_upsert "$ENV_FILE" "CSRF_TRUSTED_ORIGINS" "http://localhost:5173,http://127.0.0.1:5173,http://localhost"
  env_upsert "$ENV_FILE" "FRONTEND_URL" "http://localhost:5173"
  env_upsert "$ENV_FILE" "MERCADOPAGO_NOTIFICATION_URL" "http://localhost:8000/api/v1/system/webhooks/pix/"
fi

if ask_yes_no "Incluir token Mercado Pago agora?" "n"; then
  mp_token="$(ask_value "MERCADOPAGO_ACCESS_TOKEN" "")"
  env_upsert "$ENV_FILE" "MERCADOPAGO_ACCESS_TOKEN" "$mp_token"
fi

if ask_yes_no "Configurar backup S3/R2?" "n"; then
  env_upsert "$ENV_FILE" "BACKUP_S3_BUCKET" "$(ask_value "BACKUP_S3_BUCKET" "")"
  env_upsert "$ENV_FILE" "BACKUP_S3_PREFIX" "$(ask_value "BACKUP_S3_PREFIX" "db")"
  env_upsert "$ENV_FILE" "BACKUP_S3_ENDPOINT_URL" "$(ask_value "BACKUP_S3_ENDPOINT_URL" "")"
  env_upsert "$ENV_FILE" "BACKUP_S3_ACCESS_KEY_ID" "$(ask_value "BACKUP_S3_ACCESS_KEY_ID" "")"
  env_upsert "$ENV_FILE" "BACKUP_S3_SECRET_ACCESS_KEY" "$(ask_value "BACKUP_S3_SECRET_ACCESS_KEY" "")"
fi

echo
log_success ".env pronto em: $ENV_FILE"
echo
log_info "Próximos passos:"
echo "  ./install.sh deploy"
if [[ -n "$DOMAIN" ]]; then
  echo "  ./install.sh install-nginx"
  echo "  ./install.sh nginx-proxy"
fi
echo
