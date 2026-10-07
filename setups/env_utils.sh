#!/usr/bin/env bash
# Helpers para ler/escrever chaves em arquivos .env

env_trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

env_get() {
  local env_file="$1"
  local key="$2"
  local line value

  [[ -f "$env_file" ]] || return 1
  line="$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "$env_file" 2>/dev/null | tail -n 1 || true)"
  [[ -n "$line" ]] || return 1
  value="${line#*=}"
  value="${value%$'\r'}"
  value="$(env_trim "$value")"
  if [[ ${#value} -ge 2 ]]; then
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf '%s\n' "$value"
}

env_upsert() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local tmp

  mkdir -p "$(dirname "$env_file")"
  touch "$env_file"
  tmp="$(mktemp)"

  if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$env_file" 2>/dev/null; then
    awk -v k="$key" -v v="$value" '
      BEGIN { done=0 }
      {
        if ($0 ~ "^[[:space:]]*" k "[[:space:]]*=" && !done) {
          print k "=" v
          done=1
        } else {
          print $0
        }
      }
      END {
        if (!done) print k "=" v
      }
    ' "$env_file" > "$tmp"
  else
    cat "$env_file" > "$tmp"
    printf '%s=%s\n' "$key" "$value" >> "$tmp"
  fi

  mv "$tmp" "$env_file"
}

env_backup() {
  local env_file="$1"
  local backup_num=1
  local backup_file="${env_file}.bkp"

  [[ -f "$env_file" ]] || return 0
  while [[ -f "$backup_file" ]]; do
    backup_num=$((backup_num + 1))
    backup_file="${env_file}.bkp${backup_num}"
  done
  cp "$env_file" "$backup_file"
  printf '%s\n' "$backup_file"
}
