#!/usr/bin/env bash

resolve_db_url() {
  local env_file
  local candidate_name
  local candidate_value
  local line

  for candidate_name in DATABASE_URL SUPABASE_DB_URL POSTGRES_URL; do
    candidate_value="${!candidate_name:-}"
    if [[ -n "$candidate_value" ]]; then
      printf '%s\n' "$candidate_value"
      return 0
    fi
  done

  for env_file in .env.local .env; do
    if [[ ! -f "$ROOT_DIR/$env_file" ]]; then
      continue
    fi

    while IFS= read -r line || [[ -n "$line" ]]; do
      case "$line" in
        ''|'#'*)
          continue
          ;;
        DATABASE_URL=*|SUPABASE_DB_URL=*|POSTGRES_URL=*)
          candidate_value="${line#*=}"
          candidate_value="${candidate_value%\"}"
          candidate_value="${candidate_value#\"}"
          candidate_value="${candidate_value%\'}"
          candidate_value="${candidate_value#\'}"
          if [[ -n "$candidate_value" ]]; then
            printf '%s\n' "$candidate_value"
            return 0
          fi
          ;;
      esac
    done < "$ROOT_DIR/$env_file"
  done

  return 1
}
