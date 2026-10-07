#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
BACKUP_DIR="backups/db"
LOCAL_PATH=""
REMOTE_KEY=""
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --path)
      LOCAL_PATH="$2"
      shift 2
      ;;
    --remote-key)
      REMOTE_KEY="$2"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -n "$LOCAL_PATH" && -n "$REMOTE_KEY" ]]; then
  echo "Use either --path or --remote-key, not both." >&2
  exit 1
fi

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/backup.common.sh"

RESOLVED_ENV_FILE="$(resolve_workspace_path "$SCRIPT_PATH" "$ENV_FILE")"
RESOLVED_BACKUP_DIR="$(resolve_workspace_path "$SCRIPT_PATH" "$BACKUP_DIR")"

load_env_file "$RESOLVED_ENV_FILE"

DB_NAME_VALUE="$(get_env_setting DB_NAME "" "lowbid" 1)"
DB_USER_VALUE="$(get_env_setting DB_USER "" "lowbid" 1)"

DOWNLOADED_TEMP_FILE=""
SOURCE_PATH=""

if [[ -n "$REMOTE_KEY" ]]; then
  get_backup_storage_config || {
    echo "Remote restore requires BACKUP_S3_BUCKET in .env." >&2
    exit 1
  }

  DOWNLOAD_ROOT="${TMPDIR:-/tmp}/fifa-auction-hub-db-restore"
  mkdir -p "$DOWNLOAD_ROOT"
  DOWNLOADED_TEMP_FILE="$DOWNLOAD_ROOT/$(basename "$REMOTE_KEY")"

  write_backup_message "Downloading remote backup '$REMOTE_KEY'..." "START"
  receive_file_from_object_storage "$RESOLVED_ENV_FILE" "$REMOTE_KEY" "$DOWNLOADED_TEMP_FILE"
  SOURCE_PATH="$DOWNLOADED_TEMP_FILE"
elif [[ -n "$LOCAL_PATH" ]]; then
  SOURCE_PATH="$(resolve_workspace_path "$SCRIPT_PATH" "$LOCAL_PATH")"
else
  if [[ ! -d "$RESOLVED_BACKUP_DIR" ]]; then
    echo "Backup directory not found: $RESOLVED_BACKUP_DIR" >&2
    exit 1
  fi

  SOURCE_PATH="$(find "$RESOLVED_BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -print | sort | tail -n 1)"
  if [[ -z "$SOURCE_PATH" ]]; then
    echo "No local .dump backups found in $RESOLVED_BACKUP_DIR" >&2
    exit 1
  fi
fi

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "Backup file not found: $SOURCE_PATH" >&2
  exit 1
fi

case "$SOURCE_PATH" in
  *.dump|*.backup) ;;
  *)
    echo "This restore script currently supports .dump/.backup files created by setups/backup.sh." >&2
    exit 1
    ;;
esac

CHECKSUM_PATH="${SOURCE_PATH}.sha256.txt"
if [[ -f "$CHECKSUM_PATH" ]]; then
  EXPECTED_CHECKSUM="$(awk '{print $1}' "$CHECKSUM_PATH" | head -n 1)"
  ACTUAL_CHECKSUM="$(sha256sum "$SOURCE_PATH" | awk '{print $1}')"
  if [[ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]]; then
    echo "Checksum mismatch for $SOURCE_PATH" >&2
    exit 1
  fi
  write_backup_message "Checksum verified for '$SOURCE_PATH'." "OK"
fi

if [[ "$FORCE" != "1" ]]; then
  echo "This will overwrite objects inside database '$DB_NAME_VALUE'."
  read -r -p "Type RESTORE to continue: " CONFIRMATION
  if [[ "$CONFIRMATION" != "RESTORE" ]]; then
    echo "Restore cancelled by user." >&2
    exit 1
  fi
fi

DB_CONTAINER_ID="$(ensure_service_running "$RESOLVED_ENV_FILE" db)"
CONTAINER_FILE_NAME="$(cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)-$(basename "$SOURCE_PATH")"
DB_CONTAINER_PATH="/tmp/$CONTAINER_FILE_NAME"

cleanup() {
  remove_container_file "$RESOLVED_ENV_FILE" db "$DB_CONTAINER_PATH"
  if [[ -n "$DOWNLOADED_TEMP_FILE" && -f "$DOWNLOADED_TEMP_FILE" ]]; then
    rm -f "$DOWNLOADED_TEMP_FILE"
  fi
}
trap cleanup EXIT

write_backup_message "Restoring database '$DB_NAME_VALUE' from '$SOURCE_PATH'..." "START"

invoke_docker cp "$SOURCE_PATH" "${DB_CONTAINER_ID}:$DB_CONTAINER_PATH"
TERMINATE_SQL="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME_VALUE' AND pid <> pg_backend_pid();"
invoke_docker_compose "$RESOLVED_ENV_FILE" exec -T db sh -lc "psql -U \"$DB_USER_VALUE\" -d postgres -v ON_ERROR_STOP=1 -c \"$TERMINATE_SQL\""
invoke_docker_compose "$RESOLVED_ENV_FILE" exec -T db sh -lc "pg_restore -U \"$DB_USER_VALUE\" -d \"$DB_NAME_VALUE\" --clean --if-exists --no-owner --no-privileges \"$DB_CONTAINER_PATH\""

trap - EXIT
cleanup

write_backup_message "Restore finished for database '$DB_NAME_VALUE'." "OK"
