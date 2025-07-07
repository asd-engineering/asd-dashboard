see *args:
  bash scripts/just/search-and-export.sh {{args}}

src-list dirs="src":
  bash scripts/just/list-and-export.sh list {{dirs}}

src-export dirs="src":
  bash scripts/just/list-and-export.sh export {{dirs}}

src-all dirs="src tests":
  bash scripts/just/list-and-export.sh export {{dirs}}
