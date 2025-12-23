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

pw-ci-test COUNT="10":
    rm -rf log.txt
    seq {{COUNT}} | xargs -n1 -I{} just test >> log.txt

# extract unique error messages with locations, group test cases per message
pw-extract-errors ARGS="":
    #!/usr/bin/env node
  
    const args = "{{ARGS}}".split(' ').filter(Boolean);
    const [inPath = 'playwright-report.json', outPath = 'errors.json'] = args;

    const fs = require('fs');
    const path = require('path');

    function readJsonSafe(p) {
      const abs = path.resolve(process.cwd(), p);
      if (!fs.existsSync(abs)) throw new Error(`Input not found: ${abs}`);
      const raw = fs.readFileSync(abs, 'utf8');
      try { return JSON.parse(raw); }
      catch (e) { throw new Error(`Failed to parse JSON from ${abs}: ${e.message}`); }
    }

    // Remove ANSI escape sequences.
    function stripAnsi(s) {
      return String(s).replace(
        // \x1B or \u001b CSI/OSC/etc.
        /[\u001B\u009B][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      );
    }

    // Remove code-frame lines like "  105 | await expect(...)" or caret lines with only "^".
    function removeCodeFrameLines(text) {
      const lines = text.split(/\r?\n/);
      const filtered = lines.filter(l => {
        if (/^\s*\d+\s*\|/.test(l)) return false;    // numbered source line
        if (/^\s*\^\s*$/.test(l)) return false;      // caret-only line
        if (/^\s*\|\s*$/.test(l)) return false;      // stray bar
        return true;
      });
      return filtered.join('\n');
    }

    // Truncate at the first stack-frame line (starts with "at ...:line:col")
    function truncateBeforeStack(text) {
      const idx = text.search(/\n\s*at [^\n]+:\d+:\d+/);
      return idx >= 0 ? text.slice(0, idx) : text;
    }

    // Normalize whitespace (collapse spaces; trim edges; collapse >2 newlines to 2)
    function normalizeWhitespace(text) {
      let t = text.replace(/[ \t]+/g, ' ');
      t = t.replace(/\n{3,}/g, '\n\n');
      return t.trim();
    }

    function normalizeMessage(msg) {
      let t = stripAnsi(String(msg || ''));
      t = truncateBeforeStack(t);
      t = removeCodeFrameLines(t);
      t = normalizeWhitespace(t);
      return t;
    }

    function* findTestResults(node, parents = []) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) yield* findTestResults(item, parents);
        return;
      }
      // Playwright test nodes often have results[]
      if (Array.isArray(node.results)) {
        for (const r of node.results) yield { result: r, test: node, parents };
      }
      for (const k of Object.keys(node)) {
        if (k === 'results') continue;
        const v = node[k];
        if (v && typeof v === 'object') yield* findTestResults(v, parents.concat(node));
      }
    }

    function getContainerInfo(parents) {
      const fileHolder = parents.find(p => p && typeof p === 'object' && p.file);
      const titleHolder = parents.find(p => p && typeof p === 'object' && p.title);
      return {
        containerFile: fileHolder?.file || null,
        containerTitle: titleHolder?.title || null,
      };
    }

    const report = readJsonSafe(inPath);
    // Map<normalizedMessage, { rawSamples:Set<string>, stacks:Set<string>, tests:[], locFreq:Map<locKey,count> }>
    const grouped = new Map();

    for (const { result, test, parents } of findTestResults(report)) {
      const isFailed =
        result?.status === 'failed' ||
        test?.status === 'failed' ||
        test?.status === 'unexpected';
      if (!isFailed) continue;

      // Collect message candidates
      const msgs = [];
      if (result?.error?.message) msgs.push(result.error.message);
      if (Array.isArray(result?.errors)) {
        for (const e of result.errors) if (e?.message) msgs.push(e.message);
      }
      if (msgs.length === 0) continue;

      const stacks = [];
      if (result?.error?.stack) stacks.push(result.error.stack);
      if (Array.isArray(result?.errors)) {
        for (const e of result.errors) if (e?.stack) stacks.push(e.stack);
      }

      const errorLocation = result?.errorLocation || result?.error?.location || null;
      const locKey = errorLocation ? JSON.stringify(errorLocation) : null;

      const { containerFile, containerTitle } = getContainerInfo(parents);
      const testCase = {
        title: test?.title || containerTitle || null,
        file: test?.file || containerFile || null,
        project: test?.projectName || test?.projectId || null,
      };

      // For each message in this result, group by normalized content
      const seenThisResult = new Set();
      for (const m of msgs) {
        const norm = normalizeMessage(m);
        if (!norm) continue;

        // Avoid adding the same normalized message twice from one result
        if (seenThisResult.has(norm)) continue;
        seenThisResult.add(norm);

        let bucket = grouped.get(norm);
        if (!bucket) {
          bucket = {
            rawSamples: new Set(),      // keep one or two raw exemplars
            stacks: new Set(),
            tests: [],
            locFreq: new Map(),         // key -> count
          };
          grouped.set(norm, bucket);
        }

        // Keep some raw samples (useful for debugging)
        if (bucket.rawSamples.size < 2) bucket.rawSamples.add(m);
        for (const s of stacks) bucket.stacks.add(s);

        bucket.tests.push(testCase);
        if (locKey) bucket.locFreq.set(locKey, (bucket.locFreq.get(locKey) || 0) + 1);
      }
    }

    // Choose the most frequent location per message
    function pickMostFrequentLoc(locFreq) {
      if (!locFreq || locFreq.size === 0) return null;
      let bestKey = null, bestCount = -1;
      for (const [k, c] of locFreq.entries()) {
        if (c > bestCount) { bestCount = c; bestKey = k; }
      }
      try { return JSON.parse(bestKey); } catch { return null; }
    }

    const output = {
      generatedAt: new Date().toISOString(),
      totalUniqueErrors: grouped.size,
      errors: Array.from(grouped.entries()).map(([normalized, bucket]) => ({
        errorLocation: pickMostFrequentLoc(bucket.locFreq),
        messages: [normalized],                      // single normalized representative (deduped)
        stacks: Array.from(bucket.stacks),           // may be empty
        tests: bucket.tests,                         // all test cases that hit this message
      })),
    };

    fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(output, null, 2), 'utf8');
    console.log(`Wrote ${output.totalUniqueErrors} unique error(s) to ${outPath}`);
