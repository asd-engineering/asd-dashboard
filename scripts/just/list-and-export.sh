#!/usr/bin/env bash
set -euo pipefail

OUTDIR="local"
OUTPUT="$OUTDIR/list-and-export.src"
MODE="${1:-list}"   # First arg is mode
shift               # Remaining args are folders

EXCLUDE_FILES="${EXCLUDE_FILES:-}"
EXCLUDE_FOLDERS="${EXCLUDE_FOLDERS:-}"

should_exclude() {
  local file="$1"
  IFS=',' read -ra EXCLUDES <<< "$EXCLUDE_FILES"
  for exclude in "${EXCLUDES[@]}"; do
    if [[ "$file" == "$exclude" ]]; then
      return 0
    fi
  done
  return 1
}

should_exclude_folder() {
  local file="$1"
  IFS=',' read -ra FOLDERS <<< "$EXCLUDE_FOLDERS"
  for folder in "${FOLDERS[@]}"; do
    if [[ "$file" == "$folder"* ]]; then
      return 0
    fi
  done
  return 1
}

mkdir -p "$OUTDIR"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

{
  echo "%%%%list_and_export"
  echo "%%%%mode: $MODE"
  echo "%%%%generated_at: $NOW"

  for ROOT in "$@"; do
    if [[ ! -d "$ROOT" ]]; then
      echo "❌ Directory '$ROOT' does not exist." >&2
      continue
    fi

    mapfile -t FILES < <(
      find "$ROOT" -type f \
        \( -iname '*.ts' -o -iname '*.js' -o -iname '*.css' -o -iname '*.yaml' -o -iname '*.yml' -o -iname '*.json' -o -iname '*.html' -o -iname '*.svelte' \) \
        | sort
    )

    echo "%%%%root: $ROOT"
    echo "%%%%total_files: ${#FILES[@]}"
    echo "%%%%files:"

    for FILE in "${FILES[@]}"; do
      REL_FILE="${FILE#$ROOT/}"
      if should_exclude "$REL_FILE" || should_exclude_folder "$REL_FILE"; then
        continue
      fi
      echo "$ROOT/$REL_FILE:"
      if [[ "$MODE" == "export" ]]; then
        echo -e '```'
        cat "$FILE"
        echo -e '```'
      fi
    done
  done
} > "$OUTPUT"

echo "✅ $MODE for [$*] written to $OUTPUT"
