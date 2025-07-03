#!/usr/bin/env bash

set -e

OUTDIR="local"
OUTPUT="$OUTDIR/search-results.src"
EXTS="ts|js|css|yaml|yml|json|html|svelte"

# Optional: comma-separated list of files to exclude from export
EXCLUDE_FILES="${EXCLUDE_FILES:-}"

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

EXCLUDE_FOLDERS="${EXCLUDE_FOLDERS:-}"

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

if [[ -n "$1" ]]; then
  TERM="$1"
else
  read -p "Search term: " TERM
fi

mkdir -p "$OUTDIR"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

declare -A FILES
MATCH_IDX=1

MATCHES_RAW=$(rg --no-heading --line-number --color never -g "*.{ts,js,css,yaml,yml,json,html,svelte}" "$TERM" || true)

if [[ -z "$MATCHES_RAW" ]]; then
  echo "No matches found!"
  exit 0
fi

echo "Matches:"

# Buffer for matches output
MATCHES_LIST=()

while IFS= read -r LINE; do
  FILE=$(echo "$LINE" | cut -d: -f1)
  LINENO=$(echo "$LINE" | cut -d: -f2)
  MATCHTXT=$(echo "$LINE" | cut -d: -f3-)
  # Terminal output
  printf "[%d] %s:%s → %s\n" "$MATCH_IDX" "$FILE" "$LINENO" "$MATCHTXT"
  # Output for matches section (match line first, dan de code eronder)
  MATCHES_LIST+=("[$MATCH_IDX] $FILE:$LINENO"
"$MATCHTXT"
  )
  if ! should_exclude "$FILE" && ! should_exclude_folder "$FILE"; then
    FILES["$FILE"]=1
  fi
  MATCH_IDX=$((MATCH_IDX + 1))
done <<< "$MATCHES_RAW"

{
  echo "%%%%search_key: $TERM"
  echo "%%%%search_date: $NOW"
  echo "%%%%total_files: ${#FILES[@]}"
  echo "%%%%matches:"
  for MATCH in "${MATCHES_LIST[@]}"; do
    echo "$MATCH"
  done
  echo "%%%%files:"
  for FILE in "${!FILES[@]}"; do
    echo "$FILE:"
    echo -e '```'
    cat "$FILE"
    echo -e '```'
  done
} > "$OUTPUT"

echo "✅ Results written to $OUTPUT"
