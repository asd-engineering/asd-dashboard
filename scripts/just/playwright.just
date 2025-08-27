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

# extract unique error messages with locations, group test cases per message
pw-extract-errors ARGS="":
    #!/usr/bin/env node
    const args = "{{ARGS}}".split(' ').filter(Boolean);
    const [inPath = 'playwright-report.json', outPath = 'errors.json'] = args;

    const fs = require('fs');
    const path = require('path');

    function readJson(p) {
      const raw = fs.readFileSync(p, 'utf8');
      return JSON.parse(raw);
    }

    function* findResults(node, parents = []) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) yield* findResults(item, parents);
        return;
      }
      if (Array.isArray(node.results)) {
        for (const r of node.results) {
          yield { result: r, test: node, parents };
        }
      }
      for (const k of Object.keys(node)) {
        yield* findResults(node[k], parents.concat(node));
      }
    }

    const report = readJson(path.resolve(inPath));
    const grouped = new Map();

    for (const { result, test, parents } of findResults(report)) {
      const isFailed = result.status === 'failed' || test.status === 'failed' || test.status === 'unexpected';
      if (!isFailed) continue;

      const errorLoc = result.errorLocation || result.error?.location || null;
      const msgs = [];

      if (result.error?.message) msgs.push(result.error.message);
      if (Array.isArray(result.errors)) {
        for (const e of result.errors) if (e?.message) msgs.push(e.message);
      }

      // normalize + dedup messages inside one result
      const uniqMsgs = [...new Set(msgs.map(String))];
      for (const msg of uniqMsgs) {
        const key = msg.trim();
        if (!grouped.has(key)) {
          grouped.set(key, {
            errorLocation: errorLoc,
            messages: [msg],
            stacks: result.error?.stack ? [result.error.stack] : [],
            tests: [],
          });
        }
        grouped.get(key).tests.push({
          title: parents.find(p => p.title)?.title || null,
          file: parents.find(p => p.file)?.file || null,
          project: test.projectName || null,
        });
      }
    }

    const out = {
      generatedAt: new Date().toISOString(),
      totalUniqueErrors: grouped.size,
      errors: Array.from(grouped.values()),
    };

    fs.writeFileSync(path.resolve(outPath), JSON.stringify(out, null, 2));
    console.log(`Wrote ${grouped.size} unique error(s) to ${outPath}`);
