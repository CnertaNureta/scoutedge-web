#!/usr/bin/env bash

resolve_psql_bin() {
  local candidate

  if command -v psql >/dev/null 2>&1; then
    command -v psql
    return 0
  fi

  for candidate in \
    /opt/homebrew/bin/psql \
    /usr/local/bin/psql \
    /opt/homebrew/opt/libpq/bin/psql \
    /Applications/Postgres.app/Contents/Versions/latest/bin/psql
  do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}
