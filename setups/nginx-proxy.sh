#!/usr/bin/env bash
################################################################################
# Proxy reverso + domínio + SSL (Let's Encrypt) — Mega8Lance
#
# Host Nginx (80/443) → Docker nginx em 127.0.0.1:8080
# Também atualiza ALLOWED_HOSTS, CORS, CSRF, FRONTEND_URL no .env
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
SITE_AVAILABLE="/etc/nginx/sites-available/mega8lance-proxy"
SITE_ENABLED="/etc/nginx/sites-enabled/mega8lance-proxy"
APP_BIND_IP="127.0.0.1"
APP_BIND_PORT="8080"

# shellcheck source=/dev/null
source "${SCRIPT_DIR}/env_utils.sh"

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

if [[ "${EUID}" -ne 0 ]]; then
  log_error "Execute como root (sudo)."
  exit 1
fi

validate_domain() {
  local domain="$1"
  [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]
}

configure_nginx_conf() {
  local NGINX_CONF="/etc/nginx/nginx.conf"
  local INCLUDE_LINE="    include /etc/nginx/sites-enabled/*;"

  [[ -f "${NGINX_CONF}.bak" ]] || cp "$NGINX_CONF" "${NGINX_CONF}.bak"

  if ! grep -qF "$INCLUDE_LINE" "$NGINX_CONF"; then
    sed -i "/http {/{
            :a
            n
            /}/!ba
            i\\
$INCLUDE_LINE
        }" "$NGINX_CONF"
  fi
}

update_project_env() {
  local domain="$1"
  local use_ssl="$2"
  local scheme="http"
  local origin
  local backup

  [[ "$use_ssl" =~ ^[sS]$ ]] && scheme="https"
  origin="${scheme}://${domain}"

  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "${PROJECT_ROOT}/.env.example" ]]; then
      cp "${PROJECT_ROOT}/.env.example" "$ENV_FILE"
      log_info ".env criado a partir de .env.example"
    else
      touch "$ENV_FILE"
    fi
  fi

  backup="$(env_backup "$ENV_FILE")"
  [[ -n "$backup" ]] && log_info "Backup do .env: $backup"

  env_upsert "$ENV_FILE" "ALLOWED_HOSTS" "${domain},www.${domain},localhost,127.0.0.1,backend,nginx"
  env_upsert "$ENV_FILE" "CORS_ALLOWED_ORIGINS" "${origin},https://www.${domain},http://www.${domain}"
  env_upsert "$ENV_FILE" "CSRF_TRUSTED_ORIGINS" "${origin},https://www.${domain},http://www.${domain}"
  env_upsert "$ENV_FILE" "FRONTEND_URL" "$origin"
  env_upsert "$ENV_FILE" "MERCADOPAGO_NOTIFICATION_URL" "${origin}/api/v1/system/webhooks/pix/"
  env_upsert "$ENV_FILE" "NGINX_PUBLISH_IP" "$APP_BIND_IP"
  env_upsert "$ENV_FILE" "NGINX_PUBLISH_PORT" "$APP_BIND_PORT"
  env_upsert "$ENV_FILE" "VITE_API_URL" "/api/v1"

  if [[ "$use_ssl" =~ ^[sS]$ ]]; then
    env_upsert "$ENV_FILE" "COOKIE_SECURE" "True"
    env_upsert "$ENV_FILE" "DEBUG" "False"
    env_upsert "$ENV_FILE" "DJANGO_SETTINGS_MODULE" "core.settings.production"
    env_upsert "$ENV_FILE" "SESSION_COOKIE_DOMAIN" ".$domain"
  else
    env_upsert "$ENV_FILE" "COOKIE_SECURE" "False"
  fi

  log_success ".env atualizado para o domínio ${domain}"
}

rebind_docker_nginx() {
  if ! command -v docker >/dev/null 2>&1; then
    log_warning "Docker não encontrado; ajuste NGINX_PUBLISH_* e suba o compose manualmente."
    return 0
  fi

  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/compose_env.sh"
  cd "$PROJECT_ROOT"
  compose_env_init || {
    log_warning "Não foi possível carregar .env para o compose."
    return 0
  }

  log_info "Recriando container nginx em ${APP_BIND_IP}:${APP_BIND_PORT}..."
  if docker_compose up -d --force-recreate --no-deps nginx; then
    log_success "Container mega8lance_nginx republicado."
  else
    log_warning "Falha ao recriar nginx. Rode depois: ./install.sh deploy"
  fi
}

write_proxy_config() {
  local domain="$1"

  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

  cat > "$SITE_AVAILABLE" << EOF
# Mega8Lance — proxy reverso (gerado por setups/nginx-proxy.sh)
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};

    client_max_body_size 20M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://${APP_BIND_IP}:${APP_BIND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

  ln -sf "$SITE_AVAILABLE" "$SITE_ENABLED"
  rm -f /etc/nginx/sites-enabled/default
}

ensure_certbot() {
  local need_install=false

  if ! command -v certbot >/dev/null 2>&1; then
    need_install=true
  fi
  if ! dpkg -l 2>/dev/null | grep -q "^ii.*python3-certbot-nginx"; then
    need_install=true
  fi

  if [[ "$need_install" == true ]]; then
    log_info "Instalando Certbot + plugin Nginx..."
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx
  fi
}

echo "========================================================="
echo "  Proxy reverso / domínio — Mega8Lance"
echo "========================================================="
echo

DOMAIN=""
while [[ -z "$DOMAIN" ]]; do
  read -r -p "Digite o domínio (ex: leilao.exemplo.com): " DOMAIN
  DOMAIN="$(echo "$DOMAIN" | tr '[:upper:]' '[:lower:]' | xargs)"
  if [[ -z "$DOMAIN" ]]; then
    log_error "Domínio não pode estar vazio."
    continue
  fi
  if ! validate_domain "$DOMAIN"; then
    log_error "Domínio inválido."
    DOMAIN=""
  fi
done

echo
read -r -p "Configurar SSL com Let's Encrypt? (s/n): " SETUP_SSL
SETUP_SSL="$(echo "$SETUP_SSL" | tr '[:upper:]' '[:lower:]')"

if ! command -v nginx >/dev/null 2>&1; then
  log_info "Nginx não encontrado. Instalando via apt..."
  apt-get update -qq
  apt-get install -y nginx
fi

configure_nginx_conf
mkdir -p /var/www/html/.well-known/acme-challenge

if [[ "$SETUP_SSL" =~ ^[sS]$ ]]; then
  ensure_certbot
fi

update_project_env "$DOMAIN" "$SETUP_SSL"
write_proxy_config "$DOMAIN"
rebind_docker_nginx

log_info "Testando Nginx..."
if ! nginx -t; then
  log_error "Configuração inválida."
  exit 1
fi
systemctl restart nginx
log_success "Nginx reiniciado."

if [[ "$SETUP_SSL" =~ ^[sS]$ ]]; then
  echo
  log_warning "O DNS de ${DOMAIN} precisa apontar para este servidor."
  read -r -p "Pressione Enter para emitir o certificado..."
  if certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
    log_success "SSL configurado."
    systemctl reload nginx
  else
    log_warning "Falha no Certbot. Tente: sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  fi
fi

# Atualiza CORS no compose do backend (ALLOWED_HOSTS etc. vêm do .env)
if command -v docker >/dev/null 2>&1; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/compose_env.sh"
  cd "$PROJECT_ROOT"
  if compose_env_init 2>/dev/null; then
    log_info "Recriando backend para aplicar ALLOWED_HOSTS/CORS..."
    docker_compose up -d --force-recreate --no-deps backend celery_worker celery_beat 2>/dev/null || true
  fi
fi

echo
log_success "Configuração concluída."
echo
log_info "Resumo:"
echo "  Domínio     : ${DOMAIN}"
echo "  App Docker  : http://${APP_BIND_IP}:${APP_BIND_PORT}"
if [[ "$SETUP_SSL" =~ ^[sS]$ ]]; then
  echo "  Acesso      : https://${DOMAIN}"
else
  echo "  Acesso      : http://${DOMAIN}"
  echo "  SSL depois  : sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi
echo
log_info "Se o site não subir, rode: ./install.sh deploy"
echo
