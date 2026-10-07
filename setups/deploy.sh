#!/usr/bin/env bash
# ==============================================================================
# Mega8Lance - DEPLOY SYSTEM (READINESS + DIAGNOSTIC HEALTHCHECK)
# Version: 1.0.0
# ==============================================================================

set -euo pipefail

LOG_FILE="deploy.log"
VERSION_JSON="version.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=compose_env.sh
source "$SCRIPT_DIR/compose_env.sh"
compose_env_init || exit 1
CLEAN_CONTAINERS=false
CLEAN_BUILD_VOLUMES=false

show_usage() {
  cat <<'EOF'
Usage: setups/deploy.sh [--clean-containers] [--clean-build-volumes] [--full-clean]

Default deploy is incremental: it preserves containers and volumes, then lets
docker compose recreate only changed services.

Options:
  --clean-containers      Run docker compose down --remove-orphans before deploy.
  --clean-build-volumes   Remove build/static volumes before deploy.
  --full-clean            Enable both clean options above.
  -h, --help              Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean-containers)
      CLEAN_CONTAINERS=true
      ;;
    --clean-build-volumes)
      CLEAN_BUILD_VOLUMES=true
      ;;
    --full-clean)
      CLEAN_CONTAINERS=true
      CLEAN_BUILD_VOLUMES=true
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      printf 'Unknown deploy option: %s\n\n' "$1" >&2
      show_usage >&2
      exit 1
      ;;
  esac
  shift
done

CRITICAL_CONTAINERS=(
  "mega8lance_db"
  "mega8lance_redis"
  "mega8lance_backend"
  "mega8lance_celery_worker"
  "mega8lance_celery_beat"
  "mega8lance_frontend"
  "mega8lance_nginx"
)

CORE_CONTAINERS=(
  "mega8lance_db"
  "mega8lance_redis"
)

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
  printf '[%s] [%s] %s\n' "$timestamp" "$level" "$message" >> "$LOG_FILE"
}

read_version_field() {
  local field="$1"
  if [[ ! -f "$VERSION_JSON" ]]; then
    printf 'unknown\n'
    return 0
  fi

  sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$VERSION_JSON" | head -n 1
}

get_container_health() {
  local container="$1"
  docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo "unknown"
}

get_container_state() {
  local container="$1"
  docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown"
}

show_container_diagnostics() {
  local tail_lines="${1:-80}"
  shift || true
  local container state health line

  for container in "$@"; do
    state="$(get_container_state "$container")"
    health="$(get_container_health "$container")"
    log "Diagnostics for $container -> state=$state health=$health" "DIAG" "$C_MAGENTA"
    docker inspect --format='ExitCode={{.State.ExitCode}} Error={{.State.Error}} StartedAt={{.State.StartedAt}} FinishedAt={{.State.FinishedAt}}' "$container" 2>/dev/null |
      while IFS= read -r line; do
        log "$container inspect: $line" "DIAG" "$C_MAGENTA"
      done || true
    log "$container last $tail_lines log lines:" "DIAG" "$C_MAGENTA"
    docker logs --tail "$tail_lines" "$container" 2>&1 |
      while IFS= read -r line; do
        log "$container | $line" "LOG" "$C_RESET"
      done || true
  done
}

retry() {
  local max_attempts="$1"
  local delay_seconds="$2"
  local task_name="$3"
  shift 3

  local attempt last_error=""
  for ((attempt=1; attempt<=max_attempts; attempt++)); do
    if last_error="$("$@" 2>&1)"; then
      log "$task_name succeeded (attempt $attempt)" "RETRY" "$C_GREEN"
      return 0
    fi

    log "$task_name failed (attempt $attempt/$max_attempts): ${last_error:-unknown error}" "RETRY" "$C_YELLOW"
    if [[ "$attempt" -lt "$max_attempts" ]]; then
      sleep "$delay_seconds"
    fi
  done

  log "$task_name failed after $max_attempts attempts. Last error: ${last_error:-unknown error}" "ERROR" "$C_RED"
  return 1
}

invoke_task() {
  local title="$1"
  shift
  local diagnostics=()
  if [[ "${1:-}" == "--diagnostics" ]]; then
    shift
    while [[ $# -gt 0 && "${1:-}" != "--" ]]; do
      diagnostics+=("$1")
      shift
    done
    [[ "${1:-}" == "--" ]] && shift
  fi

  log "TASK: $title" "TASK" "$C_CYAN"
  if "$@"; then
    log "SUCCESS: $title" "OK" "$C_GREEN"
  else
    log "FAIL: $title" "ERROR" "$C_RED"
    if [[ ${#diagnostics[@]} -gt 0 ]]; then
      show_container_diagnostics 80 "${diagnostics[@]}"
    fi
    exit 1
  fi
}

check_container_running() {
  local container="$1"
  local state
  state="$(get_container_state "$container")"
  [[ "$state" == "running" ]] || {
    printf '%s is not running (%s)\n' "$container" "$state"
    return 1
  }
}

check_postgres_ready() {
  check_container_running "mega8lance_db" || return 1
  [[ "$(get_container_health mega8lance_db)" == "healthy" ]] && return 0
  docker exec mega8lance_db sh -ec 'pg_isready -h 127.0.0.1 -d "$POSTGRES_DB" -U "$POSTGRES_USER"' >/dev/null 2>&1 || {
    printf 'DB not ready (docker health: %s)\n' "$(get_container_health mega8lance_db)"
    return 1
  }
}

check_redis_ready() {
  check_container_running "mega8lance_redis" || return 1
  [[ "$(get_container_health mega8lance_redis)" == "healthy" ]] && return 0
  docker exec mega8lance_redis redis-cli ping >/dev/null 2>&1 || {
    printf 'Redis not ready (docker health: %s)\n' "$(get_container_health mega8lance_redis)"
    return 1
  }
}

check_backend_ready() {
  check_container_running "mega8lance_backend" || return 1
  docker exec mega8lance_backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/system/health/', timeout=5).read()" >/dev/null 2>&1 || {
    printf 'Backend endpoint not ready (docker health: %s)\n' "$(get_container_health mega8lance_backend)"
    return 1
  }
}

check_frontend_ready() {
  check_container_running "mega8lance_frontend" || return 1
  docker exec mega8lance_frontend wget -q -O /dev/null http://127.0.0.1/ >/dev/null 2>&1 || {
    printf 'Frontend endpoint not ready (docker health: %s)\n' "$(get_container_health mega8lance_frontend)"
    return 1
  }
}

check_nginx_ready() {
  check_container_running "mega8lance_nginx" || return 1
  docker exec mega8lance_nginx wget -q -O /dev/null http://127.0.0.1/api/v1/system/health/ >/dev/null 2>&1 || {
    printf 'Nginx API proxy not ready (docker health: %s)\n' "$(get_container_health mega8lance_nginx)"
    return 1
  }
  docker exec mega8lance_nginx wget -q -O /dev/null http://127.0.0.1/ >/dev/null 2>&1 || {
    printf 'Nginx frontend proxy not ready (docker health: %s)\n' "$(get_container_health mega8lance_nginx)"
    return 1
  }
}

task_preflight() {
  docker version --format "{{.Server.Version}}" >/dev/null 2>&1
  [[ -f docker-compose.yml ]]
  [[ -f .env || -f backend/.env ]]
}

task_git_pull() {
  local repo_root="$COMPOSE_PROJECT_ROOT"

  if [[ ! -d "$repo_root/.git" ]]; then
    log "Not a git repository; skipping git pull." "SKIP" "$C_YELLOW"
    return 0
  fi

  command -v git >/dev/null 2>&1 || {
    printf 'git not found\n'
    return 1
  }

  log "Pulling latest changes from origin..." "GIT" "$C_CYAN"
  git -C "$repo_root" pull --ff-only
}

task_clean_containers() {
  docker_compose down --remove-orphans
}

task_clean_build_volumes() {
  local current_volumes volume found_static=false found_media=false

  log "Removing static volume while preserving uploaded media..." "CLEAN" "$C_MAGENTA"
  current_volumes="$(docker volume ls -q)"

  while IFS= read -r volume; do
    [[ -z "$volume" ]] && continue
    case "$volume" in
      *_static)
        found_static=true
        log "Removing volume: $volume" "CLEAN" "$C_MAGENTA"
        docker volume rm "$volume" >/dev/null 2>&1 || true
        ;;
      *_media)
        found_media=true
        log "Preserving media volume: $volume" "CLEAN" "$C_GREEN"
        ;;
    esac
  done <<< "$current_volumes"

  if [[ "$found_static" == false ]]; then
    log "Static volume not found. Skipping." "CLEAN" "$C_MAGENTA"
  fi
  if [[ "$found_media" == false ]]; then
    log "Media volume not found. Future uploads will populate it." "CLEAN" "$C_YELLOW"
  fi
}

task_build_images() {
  docker_compose build backend
  docker_compose build frontend
}

task_start_core_services() {
  docker_compose up -d db redis
}

task_wait_core_health() {
  retry 40 3 "Postgres Health" check_postgres_ready
  retry 30 2 "Redis Health" check_redis_ready
}

task_run_migrations() {
  docker_compose run --rm --no-deps backend python manage.py migrate --noinput
}

task_collect_static() {
  docker_compose run --rm --no-deps backend python manage.py collectstatic --noinput
}

task_start_application_services() {
  docker_compose up -d --remove-orphans --no-build
  log "Recreating nginx container to reload mounted configuration..." "SYNC" "$C_CYAN"
  docker_compose up -d --force-recreate --no-deps --no-build nginx
}

task_wait_backend_readiness() {
  retry 40 3 "Backend Readiness" check_backend_ready
}

task_wait_frontend_readiness() {
  retry 40 3 "Frontend Readiness" check_frontend_ready
}

task_wait_nginx_readiness() {
  retry 30 3 "Nginx Readiness" check_nginx_ready
}

task_final_verification() {
  local container state health not_running=()
  for container in "${CRITICAL_CONTAINERS[@]}"; do
    state="$(get_container_state "$container")"
    health="$(get_container_health "$container")"
    if [[ "$state" == "running" ]]; then
      log "[$container] RUNNING (docker health: $health)" "VERIFY" "$C_GREEN"
    else
      log "[$container] NOT RUNNING (state: $state, docker health: $health)" "FAIL" "$C_RED"
      not_running+=("$container ($state)")
    fi
  done

  if [[ ${#not_running[@]} -gt 0 ]]; then
    log "Critical containers not running: ${not_running[*]}" "FAIL" "$C_RED"
    return 1
  fi
}

task_post_deploy_cleanup() {
  log "Cleaning unused Docker data (keeping active build cache for faster rebuilds)..." "CLEAN" "$C_MAGENTA"
  docker image prune -f >/dev/null
  docker builder prune -f >/dev/null
}

command -v clear >/dev/null 2>&1 && clear || true
log "Starting deployment..." "START" "$C_GREEN"
if [[ "$CLEAN_CONTAINERS" == true || "$CLEAN_BUILD_VOLUMES" == true ]]; then
  log "Clean mode: containers=$CLEAN_CONTAINERS build_volumes=$CLEAN_BUILD_VOLUMES" "START" "$C_YELLOW"
else
  log "Incremental mode: preserving containers and volumes. Use --full-clean for the old destructive flow." "START" "$C_GREEN"
fi

invoke_task "Pre-flight Validation" task_preflight
invoke_task "Git Pull" task_git_pull
if [[ "$CLEAN_CONTAINERS" == true ]]; then
  invoke_task "Clean old containers" task_clean_containers
else
  log "Skipping container cleanup; docker compose up will recreate changed services." "SKIP" "$C_YELLOW"
fi
if [[ "$CLEAN_BUILD_VOLUMES" == true ]]; then
  invoke_task "Clean build-only volumes" task_clean_build_volumes
else
  log "Skipping build-volume cleanup; static/media volumes are preserved." "SKIP" "$C_YELLOW"
fi
invoke_task "Build images" task_build_images
invoke_task "Start core services" --diagnostics "${CORE_CONTAINERS[@]}" -- task_start_core_services
invoke_task "Wait for real health" --diagnostics "${CORE_CONTAINERS[@]}" -- task_wait_core_health
invoke_task "Run Migrations" task_run_migrations
invoke_task "Collect Static" task_collect_static
invoke_task "Start application services" task_start_application_services
invoke_task "Wait Backend Readiness" --diagnostics mega8lance_backend mega8lance_db mega8lance_redis -- task_wait_backend_readiness
invoke_task "Wait Frontend Readiness" --diagnostics mega8lance_frontend -- task_wait_frontend_readiness
invoke_task "Wait Nginx Readiness" --diagnostics mega8lance_nginx mega8lance_backend mega8lance_frontend -- task_wait_nginx_readiness
invoke_task "Final Verification" task_final_verification
invoke_task "Post-Deploy Cleanup" task_post_deploy_cleanup

finish="$(date +"%Y-%m-%d %H:%M:%S")"
global_version="$(read_version_field global)"
frontend_version="$(read_version_field frontend)"
backend_version="$(read_version_field backend)"
api_version="$(read_version_field api)"

log "Deployment SUCCESS at $finish" "DONE" "$C_GREEN"

printf '\n%b============================================================%b\n' "$C_GREEN" "$C_RESET"
printf '%b DEPLOY OK (READINESS VERIFIED) %b\n' "$C_GREEN" "$C_RESET"
printf ' Global Version: %s\n' "${global_version:-unknown}"
printf ' Frontend Version: %s\n' "${frontend_version:-unknown}"
printf ' Backend Version: %s\n' "${backend_version:-unknown}"
printf ' API Version: %s\n' "${api_version:-unknown}"
printf ' Log: %s\n' "$LOG_FILE"
printf '%b============================================================%b\n\n' "$C_GREEN" "$C_RESET"
