# ──────────────────────────────────────────────────────────────
#  Playwright report helpers (no HTML viewer, name‑only workflow)
# ──────────────────────────────────────────────────────────────

# Build compressed index  → playwright-report-index.json.gz
index-report:
    node scripts/playwright-indexer.js

# List all tests (or grep by NAME regex, case‑insensitive)
#   $ just list                 # every test
#   $ just list 'drag.*drop'    # filtered list
list $NAME='.*':
    #!/usr/bin/env bash
    zcat playwright-report-index.json.gz \
      | jq -r --arg re "$NAME" '
            (.summary[]
             | select(.fullTitle | test($re; "i")))
            | "\(.status)\t\(.browser)\t\(.fullTitle)"'

# Show only failing tests (optional grep)
failures $NAME='.*':
    #!/usr/bin/env bash
    zcat playwright-report-index.json.gz \
      | jq -r --arg re "$NAME" '
            (.summary[]
             | select(.status != "passed")
             | select(.fullTitle | test($re; "i")))
            | "\(.status)\t\(.browser)\t\(.fullTitle)"'

# Dump console / network / app logs for a given test name & browser
#   $ just logs 'add 4 services'        # any browser
#   $ just logs 'add 4 services' chrome # specific
logs NAME BROWSER='.*':
    #!/usr/bin/env bash
    node scripts/playwright-extract-logs.js "{{NAME}}" "{{BROWSER}}"
