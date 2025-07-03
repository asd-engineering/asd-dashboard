see *args:
  bash scripts/just/search-and-export.sh {{args}}

src-list dir="src":
  bash scripts/just/list-and-export.sh {{dir}} list

src-exports dir="src":
  bash scripts/just/list-and-export.sh {{dir}} export
