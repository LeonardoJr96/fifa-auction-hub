#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/setups/env_utils.sh"

if [[ -f "$ROOT_DIR/.env" ]]; then
  echo ".env já existe — não sobrescrevendo."
  exit 0
fi

SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))' 2>/dev/null || openssl rand -base64 48)"
POSTGRES_PASSWORD="$(openssl rand -hex 16 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(16))')"
SCRAPER_IMPORT_KEY="$(openssl rand -hex 24 2>/dev/null || python3 -c 'import secrets; print(secrets.token_hex(24))')"

cat > "$ROOT_DIR/.env" <<EOF
# Django
SECRET_KEY=${SECRET_KEY}
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=core.settings.production

# Postgres
POSTGRES_DB=fifa_auction_hub
POSTGRES_USER=fifa
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgres://fifa:${POSTGRES_PASSWORD}@db:5432/fifa_auction_hub

# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0

# CORS / CSRF (ajuste para seu domínio)
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
CSRF_TRUSTED_ORIGINS=http://localhost:8080,http://127.0.0.1:8080
COOKIE_SECURE=False

# Frontend (build Docker — mesma origem via nginx)
VITE_API_URL=/api/v1

# Nginx
NGINX_PORT=8080

# Integrações
SCRAPER_IMPORT_KEY=${SCRAPER_IMPORT_KEY}
PIX_GATEWAY=payment.gateways.fake.FakePixGateway
EOF

echo "Gerado: $ROOT_DIR/.env"
echo "Revise CORS/CSRF antes do deploy em produção."
