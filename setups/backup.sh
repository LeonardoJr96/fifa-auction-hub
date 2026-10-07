#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env"
OUTPUT_DIR="backups/db"
SKIP_UPLOAD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --skip-upload)
      SKIP_UPLOAD=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_PATH="${BASH_SOURCE[0]}"
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/backup.common.sh"

RESOLVED_ENV_FILE="$(resolve_workspace_path "$SCRIPT_PATH" "$ENV_FILE")"
RESOLVED_OUTPUT_DIR="$(resolve_workspace_path "$SCRIPT_PATH" "$OUTPUT_DIR")"

load_env_file "$RESOLVED_ENV_FILE"

DB_NAME_VALUE="$(get_env_setting DB_NAME "" "lowbid" 1)"
DB_USER_VALUE="$(get_env_setting DB_USER "" "lowbid" 1)"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"

mkdir -p "$RESOLVED_OUTPUT_DIR"

DUMP_FILE_NAME="${DB_NAME_VALUE}_${TIMESTAMP}.dump"
DUMP_LOCAL_PATH="$RESOLVED_OUTPUT_DIR/$DUMP_FILE_NAME"
CHECKSUM_LOCAL_PATH="${DUMP_LOCAL_PATH}.sha256.txt"
DB_CONTAINER_PATH="/tmp/$DUMP_FILE_NAME"
REMOTE_KEY=""

if [[ "$SKIP_UPLOAD" != "1" ]] && get_backup_storage_config; then
  REMOTE_KEY="$(join_object_storage_key "$BACKUP_PREFIX" "$DB_NAME_VALUE" "$DUMP_FILE_NAME")"
fi

write_backup_message "Creating PostgreSQL backup for database '$DB_NAME_VALUE'..." "START"
DB_CONTAINER_ID="$(ensure_service_running "$RESOLVED_ENV_FILE" db)"

cleanup() {
  remove_container_file "$RESOLVED_ENV_FILE" db "$DB_CONTAINER_PATH"
}
trap cleanup EXIT

invoke_docker_compose "$RESOLVED_ENV_FILE" exec -T db sh -lc "pg_dump -U \"$DB_USER_VALUE\" -d \"$DB_NAME_VALUE\" -Fc -f \"$DB_CONTAINER_PATH\""
invoke_docker cp "${DB_CONTAINER_ID}:$DB_CONTAINER_PATH" "$DUMP_LOCAL_PATH"

CHECKSUM_VALUE="$(sha256sum "$DUMP_LOCAL_PATH" | awk '{print $1}')"
printf '%s *%s\n' "$CHECKSUM_VALUE" "$DUMP_FILE_NAME" > "$CHECKSUM_LOCAL_PATH"

write_backup_message "Local backup created at '$DUMP_LOCAL_PATH'." "OK"
write_backup_message "SHA256 saved at '$CHECKSUM_LOCAL_PATH'." "OK"

if [[ -n "$REMOTE_KEY" ]]; then
  UPLOAD_RESULT="$(send_file_to_object_storage "$RESOLVED_ENV_FILE" "$DUMP_LOCAL_PATH" "$REMOTE_KEY")"
  write_backup_message "Remote backup uploaded to '$UPLOAD_RESULT'." "OK"
else
  write_backup_message "Remote upload skipped. Configure BACKUP_S3_BUCKET to send backups to object storage." "WARN"
fi

trap - EXIT
cleanup

printf '\n'
printf 'Backup file : %s\n' "$DUMP_LOCAL_PATH"
printf 'Checksum    : %s\n' "$CHECKSUM_LOCAL_PATH"
if [[ -n "$REMOTE_KEY" ]]; then
  printf 'Remote key  : %s\n' "$REMOTE_KEY"
fi
