#!/usr/bin/env bash
################################################################################
# Instalação do Nginx (host) — FIFA Auction Hub
# Uso: sudo bash setups/install-nginx.sh [stable|mainline]
################################################################################

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

if [[ "${EUID}" -ne 0 ]]; then
  log_error "Execute como root (sudo)."
  exit 1
fi

command_exists() { command -v "$1" >/dev/null 2>&1; }

detect_ubuntu_version() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    if [[ "$ID" == "ubuntu" ]]; then
      echo "$VERSION_CODENAME"
    else
      log_warning "Sistema não é Ubuntu. Tentando continuar..."
      if command_exists lsb_release; then
        lsb_release -cs 2>/dev/null || echo "unknown"
      else
        echo "unknown"
      fi
    fi
  else
    echo "unknown"
  fi
}

nginx_installed() { command_exists nginx && nginx -v &>/dev/null; }

get_nginx_version() {
  if nginx_installed; then
    nginx -v 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n 1 || echo "unknown"
  else
    echo "not installed"
  fi
}

install_dependencies() {
  log_info "Instalando dependências..."
  apt-get update -qq
  apt-get install -y \
    curl gnupg2 ca-certificates lsb-release ubuntu-keyring \
    apt-transport-https software-properties-common >/dev/null 2>&1
  log_success "Dependências instaladas."
}

setup_nginx_repo() {
  local nginx_version="${1:-mainline}"
  local ubuntu_codename="$2"
  local repo_branch="mainline"
  local repo_file="/etc/apt/sources.list.d/nginx.list"
  local repo_line

  log_info "Configurando repositório do Nginx ($nginx_version)..."

  if [[ ! -f /usr/share/keyrings/nginx-archive-keyring.gpg ]]; then
    curl -fsSL https://nginx.org/keys/nginx_signing.key |
      gpg --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg 2>/dev/null || {
        log_error "Falha ao importar chave GPG do Nginx."
        exit 1
      }
  fi

  [[ "$nginx_version" == "stable" ]] && repo_branch="nginx"
  repo_line="deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/${repo_branch}/ubuntu ${ubuntu_codename} nginx"

  if [[ ! -f "$repo_file" ]] || ! grep -qF "$repo_line" "$repo_file" 2>/dev/null; then
    echo "$repo_line" | tee "$repo_file" >/dev/null
  fi
  apt-get update -qq
  log_success "Repositório configurado."
}

install_nginx() {
  local current_version
  current_version="$(get_nginx_version)"

  if [[ "$current_version" != "not installed" ]]; then
    log_warning "Nginx já instalado (versão: $current_version)"
    read -r -p "Deseja reinstalar? (s/n): " reinstall
    if [[ ! "$reinstall" =~ ^[sS]$ ]]; then
      log_info "Instalação cancelada."
      return 0
    fi
    apt-get remove -y nginx nginx-common nginx-full nginx-core 2>/dev/null || true
  fi

  log_info "Instalando Nginx..."
  apt-get install -y nginx >/dev/null 2>&1 || {
    log_error "Falha ao instalar Nginx."
    exit 1
  }
  log_success "Nginx instalado ($(get_nginx_version))."
}

setup_directories() {
  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  mkdir -p /var/www/html/.well-known/acme-challenge
  chown -R www-data:www-data /var/www/html/.well-known 2>/dev/null || true
  chmod -R 755 /var/www/html/.well-known
}

configure_nginx_conf() {
  local NGINX_CONF="/etc/nginx/nginx.conf"
  local INCLUDE_LINE="    include /etc/nginx/sites-enabled/*;"
  local CLIENT_MAX_BODY_SIZE="    client_max_body_size 50M;"

  [[ -f "$NGINX_CONF" ]] || {
    log_error "nginx.conf não encontrado."
    return 1
  }

  [[ -f "${NGINX_CONF}.bak" ]] || cp "$NGINX_CONF" "${NGINX_CONF}.bak"

  if ! grep -qF "client_max_body_size" "$NGINX_CONF"; then
    sed -i "/http {/a\\
$CLIENT_MAX_BODY_SIZE
" "$NGINX_CONF"
  fi

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

test_nginx_config() {
  if nginx -t >/dev/null 2>&1; then
    log_success "Configuração do Nginx válida."
    return 0
  fi
  log_error "Configuração do Nginx inválida!"
  nginx -t
  return 1
}

start_nginx_service() {
  systemctl enable nginx >/dev/null 2>&1 || true
  systemctl restart nginx >/dev/null 2>&1 || {
    log_error "Falha ao reiniciar Nginx."
    return 1
  }
  systemctl is-active --quiet nginx
}

main() {
  local nginx_version="${1:-mainline}"
  local ubuntu_codename

  if [[ ! "$nginx_version" =~ ^(stable|mainline)$ ]]; then
    log_error "Use: stable ou mainline"
    exit 1
  fi

  echo "========================================================="
  echo "  Instalação do Nginx (host) — FIFA Auction Hub"
  echo "========================================================="
  echo

  ubuntu_codename="$(detect_ubuntu_version)"
  if [[ "$ubuntu_codename" == "unknown" ]]; then
    read -r -p "Codename do Ubuntu (ex: jammy, noble): " ubuntu_codename
    [[ -n "$ubuntu_codename" ]] || {
      log_error "Codename obrigatório."
      exit 1
    }
  else
    log_info "Ubuntu: $ubuntu_codename"
  fi

  log_info "Versão a instalar: $nginx_version"
  read -r -p "Continuar? (s/n): " continue_install
  [[ "$continue_install" =~ ^[sS]$ ]] || {
    log_info "Cancelado."
    exit 0
  }

  install_dependencies
  setup_nginx_repo "$nginx_version" "$ubuntu_codename"
  install_nginx
  setup_directories
  configure_nginx_conf

  test_nginx_config || exit 1
  start_nginx_service || exit 1

  echo
  log_success "Nginx instalado."
  log_info "Próximo passo: ./install.sh nginx-proxy"
}

main "$@"
