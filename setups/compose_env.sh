#!/usr/bin/env bash
# Carrega .env da raiz (+ backend/.env se existir) para docker compose.

compose_env_init() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  COMPOSE_PROJECT_ROOT="$(cd "$script_dir/.." && pwd)"
  COMPOSE_ENV_ARGS=()

  if [[ -f "$COMPOSE_PROJECT_ROOT/.env" ]]; then
    COMPOSE_ENV_ARGS+=(--env-file "$COMPOSE_PROJECT_ROOT/.env")
  fi
  if [[ -f "$COMPOSE_PROJECT_ROOT/backend/.env" ]]; then
    COMPOSE_ENV_ARGS+=(--env-file "$COMPOSE_PROJECT_ROOT/backend/.env")
  fi

  if [[ ${#COMPOSE_ENV_ARGS[@]} -eq 0 ]]; then
    echo "Nenhum arquivo .env encontrado em $COMPOSE_PROJECT_ROOT" >&2
    return 1
  fi
}

docker_compose() {
  if [[ ${#COMPOSE_ENV_ARGS[@]} -eq 0 ]]; then
    compose_env_init || return 1
  fi
  docker compose "${COMPOSE_ENV_ARGS[@]}" "$@"
}
