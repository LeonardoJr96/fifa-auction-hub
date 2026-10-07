#!/usr/bin/env bash

write_backup_message() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp
  timestamp="$(date +"%Y-%m-%d %H:%M:%S")"
  printf '[%s] [%s] %s\n' "$timestamp" "$level" "$message"
}

resolve_workspace_path() {
  local script_path="$1"
  local target_path="$2"
  local script_dir workspace_root candidate candidate_dir candidate_name

  script_dir="$(cd "$(dirname "$script_path")" && pwd)"
  workspace_root="$(cd "$script_dir/.." && pwd)"

  if [[ "$target_path" = /* ]]; then
    printf '%s\n' "$target_path"
  else
    candidate="$workspace_root/$target_path"
    if [[ -d "$candidate" ]]; then
      (
        cd "$candidate" >/dev/null 2>&1
        pwd
      )
      return
    fi

    candidate_dir="$(dirname "$candidate")"
    candidate_name="$(basename "$candidate")"
    if [[ -d "$candidate_dir" ]]; then
      (
        cd "$candidate_dir" >/dev/null 2>&1
        printf '%s/%s\n' "$(pwd)" "$candidate_name"
      )
    else
      printf '%s\n' "$candidate"
    fi
  fi
}

trim_value() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

load_env_file() {
  local env_file="$1"
  if [[ ! -f "$env_file" ]]; then
    printf 'Env file not found: %s\n' "$env_file" >&2
    return 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    key="$(trim_value "$key")"
    value="${value%$'\r'}"

    if [[ ${#value} -ge 2 ]]; then
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$env_file"
}

get_env_setting() {
  local name="$1"
  local fallback="${2:-}"
  local default_value="${3:-}"
  local required="${4:-0}"
  local value=""

  if [[ -n "${!name:-}" ]]; then
    value="${!name}"
  elif [[ -n "$fallback" && -n "${!fallback:-}" ]]; then
    value="${!fallback}"
  else
    value="$default_value"
  fi

  if [[ "$required" == "1" && -z "$value" ]]; then
    printf 'Missing required setting: %s\n' "$name" >&2
    return 1
  fi

  printf '%s\n' "$value"
}

join_object_storage_key() {
  local result=""
  local segment trimmed

  for segment in "$@"; do
    [[ -z "$segment" ]] && continue
    trimmed="${segment#/}"
    trimmed="${trimmed%/}"
    [[ -z "$trimmed" ]] && continue

    if [[ -z "$result" ]]; then
      result="$trimmed"
    else
      result="$result/$trimmed"
    fi
  done

  printf '%s\n' "$result"
}

invoke_docker() {
  docker "$@"
}

get_docker_output() {
  docker "$@"
}

compose_base_args() {
  local env_file="$1"
  local env_file_dir workspace_root root_env_file

  env_file_dir="$(cd "$(dirname "$env_file")" && pwd)"
  # .env na raiz: dirname é o workspace; backend/.env: sobe um nível
  if [[ "$(basename "$env_file_dir")" == "backend" ]]; then
    workspace_root="$(cd "$env_file_dir/.." && pwd)"
  else
    workspace_root="$env_file_dir"
  fi
  root_env_file="$workspace_root/.env"

  printf 'compose\n'
  if [[ -f "$root_env_file" && "$root_env_file" != "$env_file" ]]; then
    printf -- '--env-file\n%s\n' "$root_env_file"
  fi
  printf -- '--env-file\n%s\n' "$env_file"
}

invoke_docker_compose() {
  local env_file="$1"
  shift
  local compose_args=()
  mapfile -t compose_args < <(compose_base_args "$env_file")
  docker "${compose_args[@]}" "$@"
}

get_docker_compose_output() {
  local env_file="$1"
  shift
  local compose_args=()
  mapfile -t compose_args < <(compose_base_args "$env_file")
  docker "${compose_args[@]}" "$@"
}

get_service_container_id() {
  local env_file="$1"
  local service="$2"
  get_docker_compose_output "$env_file" ps -q "$service" 2>/dev/null | tr -d '\r'
}

ensure_service_running() {
  local env_file="$1"
  local service="$2"
  local timeout_seconds="${3:-30}"
  local container_id deadline is_running

  container_id="$(get_service_container_id "$env_file" "$service")"
  if [[ -z "$container_id" ]]; then
    write_backup_message "Starting service '$service'..." "INFO"
    invoke_docker_compose "$env_file" up -d "$service"
  fi

  deadline=$((SECONDS + timeout_seconds))
  while (( SECONDS < deadline )); do
    container_id="$(get_service_container_id "$env_file" "$service")"
    if [[ -n "$container_id" ]]; then
      is_running="$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null || true)"
      if [[ "$is_running" == "true" ]]; then
        printf '%s\n' "$container_id"
        return 0
      fi
    fi
    sleep 1
  done

  printf "Service '%s' did not reach running state in %s seconds.\n" "$service" "$timeout_seconds" >&2
  return 1
}

remove_container_file() {
  local env_file="$1"
  local service="$2"
  local container_path="$3"

  if ! invoke_docker_compose "$env_file" exec -T "$service" sh -lc "rm -f '$container_path'" >/dev/null 2>&1; then
    write_backup_message "Could not remove temporary file '$container_path' from service '$service'." "WARN"
  fi
}

get_backup_storage_config() {
  BACKUP_BUCKET="$(get_env_setting BACKUP_S3_BUCKET "" "" 0)"
  [[ -z "$BACKUP_BUCKET" ]] && return 1

  BACKUP_PREFIX="$(get_env_setting BACKUP_S3_PREFIX "" "db" 0)"
  BACKUP_REGION_NAME="$(get_env_setting BACKUP_S3_REGION_NAME AWS_S3_REGION_NAME auto 0)"
  BACKUP_ENDPOINT_URL="$(get_env_setting BACKUP_S3_ENDPOINT_URL AWS_S3_ENDPOINT_URL "" 0)"
  BACKUP_ACCESS_KEY_ID="$(get_env_setting BACKUP_S3_ACCESS_KEY_ID AWS_ACCESS_KEY_ID "" 0)"
  BACKUP_SECRET_ACCESS_KEY="$(get_env_setting BACKUP_S3_SECRET_ACCESS_KEY AWS_SECRET_ACCESS_KEY "" 0)"
}

send_file_to_object_storage() {
  local env_file="$1"
  local local_file_path="$2"
  local remote_key="$3"
  local backend_container_id container_path

  backend_container_id="$(ensure_service_running "$env_file" backend)"
  container_path="/tmp/$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)-$(basename "$local_file_path")"

  invoke_docker cp "$local_file_path" "${backend_container_id}:$container_path"

  {
    invoke_docker_compose "$env_file" exec -T \
      -e "BACKUP_S3_BUCKET=$BACKUP_BUCKET" \
      -e "BACKUP_S3_REGION_NAME=$BACKUP_REGION_NAME" \
      -e "BACKUP_S3_ENDPOINT_URL=$BACKUP_ENDPOINT_URL" \
      -e "BACKUP_S3_ACCESS_KEY_ID=$BACKUP_ACCESS_KEY_ID" \
      -e "BACKUP_S3_SECRET_ACCESS_KEY=$BACKUP_SECRET_ACCESS_KEY" \
      -e "BACKUP_SOURCE_PATH=$container_path" \
      -e "BACKUP_S3_KEY=$remote_key" \
      backend python - <<'PY'
import boto3
import os

client = boto3.client(
    "s3",
    region_name=os.environ.get("BACKUP_S3_REGION_NAME") or None,
    endpoint_url=os.environ.get("BACKUP_S3_ENDPOINT_URL") or None,
    aws_access_key_id=os.environ.get("BACKUP_S3_ACCESS_KEY_ID") or None,
    aws_secret_access_key=os.environ.get("BACKUP_S3_SECRET_ACCESS_KEY") or None,
)

source_path = os.environ["BACKUP_SOURCE_PATH"]
bucket = os.environ["BACKUP_S3_BUCKET"]
key = os.environ["BACKUP_S3_KEY"]

client.upload_file(source_path, bucket, key, ExtraArgs={"ContentType": "application/octet-stream"})
print(f"s3://{bucket}/{key}")
PY
  } || {
    remove_container_file "$env_file" backend "$container_path"
    return 1
  }

  remove_container_file "$env_file" backend "$container_path"
}

receive_file_from_object_storage() {
  local env_file="$1"
  local remote_key="$2"
  local local_destination_path="$3"
  local backend_container_id container_path

  backend_container_id="$(ensure_service_running "$env_file" backend)"
  container_path="/tmp/$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)-$(basename "$local_destination_path")"

  {
    invoke_docker_compose "$env_file" exec -T \
      -e "BACKUP_S3_BUCKET=$BACKUP_BUCKET" \
      -e "BACKUP_S3_REGION_NAME=$BACKUP_REGION_NAME" \
      -e "BACKUP_S3_ENDPOINT_URL=$BACKUP_ENDPOINT_URL" \
      -e "BACKUP_S3_ACCESS_KEY_ID=$BACKUP_ACCESS_KEY_ID" \
      -e "BACKUP_S3_SECRET_ACCESS_KEY=$BACKUP_SECRET_ACCESS_KEY" \
      -e "BACKUP_TARGET_PATH=$container_path" \
      -e "BACKUP_S3_KEY=$remote_key" \
      backend python - <<'PY'
import boto3
import os

client = boto3.client(
    "s3",
    region_name=os.environ.get("BACKUP_S3_REGION_NAME") or None,
    endpoint_url=os.environ.get("BACKUP_S3_ENDPOINT_URL") or None,
    aws_access_key_id=os.environ.get("BACKUP_S3_ACCESS_KEY_ID") or None,
    aws_secret_access_key=os.environ.get("BACKUP_S3_SECRET_ACCESS_KEY") or None,
)

bucket = os.environ["BACKUP_S3_BUCKET"]
key = os.environ["BACKUP_S3_KEY"]
destination_path = os.environ["BACKUP_TARGET_PATH"]

client.download_file(bucket, key, destination_path)
print(destination_path)
PY
  } || {
    remove_container_file "$env_file" backend "$container_path"
    return 1
  }

  invoke_docker cp "${backend_container_id}:$container_path" "$local_destination_path"
  remove_container_file "$env_file" backend "$container_path"
}
