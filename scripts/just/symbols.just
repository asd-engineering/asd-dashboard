alias symbols := symbols-resolve

symbols-resolve query:
    #!/usr/bin/env node

    const fs = require('fs');
    const path = require('path');

    const CYAN = s => `\x1b[36m${s}\x1b[0m`;
    const YELLOW = s => `\x1b[33m${s}\x1b[0m`;
    const GRAY = s => `\x1b[90m${s}\x1b[0m`;
    const RED = s => `\x1b[31m${s}\x1b[0m`;

    const query = "{{query}}".split(' ').filter(Boolean).join(' ').trim();
    const symbolsFile = path.resolve(process.cwd(), 'symbols.json');
    const srcDir = path.resolve(process.cwd(), 'src');
    const testsDir = path.resolve(process.cwd(), 'tests');

    if (!query) {
    console.error(RED('Usage: just symbols-resolve <keywords>'));
    process.exit(1);
    }
    if (!fs.existsSync(symbolsFile)) {
    console.error(RED('❌ symbols.json not found'));
    process.exit(1);
    }

    const symbols = JSON.parse(fs.readFileSync(symbolsFile, 'utf8'));
    const q = query.toLowerCase();

    const results = symbols.filter(
    entry =>
        (entry.name && entry.name.toLowerCase().includes(q)) ||
        (entry.description && entry.description.toLowerCase().includes(q)) ||
        (entry.file && entry.file.toLowerCase().includes(q))
    );

    function printParamsAndReturns(e) {
    if (e.params && e.params.length) {
        e.params.forEach(p =>
        console.log(
            `    ${YELLOW('@param')} {${p.type || 'unknown'}} ${p.name} ${p.desc || ''}`
        )
        );
    }
    if (e.returns) {
        console.log(
        `    ${YELLOW('@returns')} {${e.returns}}`
        );
    }
    }

    function* walkSync(dir, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return;
    for (const file of fs.readdirSync(dir)) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
        yield* walkSync(full, depth + 1, maxDepth);
        } else if (/\.(js|ts|mjs|jsx|tsx)$/.test(full)) {
        yield full;
        }
    }
    }

    function fallbackContentSearch(dir, maxDepth, q) {
    let found = [];
    for (const f of walkSync(dir, 0, maxDepth)) {
        const rel = path.relative(process.cwd(), f);
        const content = fs.readFileSync(f, 'utf8');
        // Search filename and content (case-insensitive)
        if (rel.toLowerCase().includes(q)) {
        found.push({ file: rel, line: '', type: 'filename' });
        continue;
        }
        content.split('\n').forEach((line, idx) => {
        if (line.toLowerCase().includes(q)) {
            found.push({ file: rel, line: `${idx + 1}: ${line.trim()}`, type: 'content' });
        }
        });
    }
    return found;
    }

    // --- Main search
    if (results.length === 0) {
    // --- Check if keyword is "test", "tests", or starts with test: for direct folder search
    if ((/\btests?\b/.test(q) || q.startsWith('test:')) && fs.existsSync(testsDir)) {
        let subQ = q.startsWith('test:') ? q.replace(/^test:/, '').trim() : q;
        if (!subQ) subQ = 'test'; // fallback
        const found = fallbackContentSearch(testsDir, 3, subQ);
        if (found.length) {
        console.log(
            YELLOW(`No symbol matches in src for: "${query}". Fallback matches in tests/:`)
        );
        found.slice(0, 8).forEach(r => {
            if (r.type === 'filename')
            console.log(`${CYAN('[filename match]')} ${r.file}`);
            else
            console.log(`${CYAN('[content match]')} ${r.file} ${GRAY(r.line)}`);
        });
        if (found.length > 8)
            console.log(GRAY(`...and ${found.length - 8} more. Try a narrower query.`));
        if (!q.startsWith('test:'))
            console.log(GRAY(`[Tip] To search tests directly, use: just symbols-resolve "test:<keyword>"`));
        process.exit(0);
        }
        // If none in tests, fall through to src fallback
    }

    // Fallback: src directory (default maxDepth=99)
    const found = fallbackContentSearch(srcDir, 99, q);
    if (found.length) {
        console.log(
        YELLOW(`No symbol matches found for: "${query}". Fallback matches in src/:`)
        );
        found.slice(0, 8).forEach(r => {
        if (r.type === 'filename')
            console.log(`${CYAN('[filename match]')} ${r.file}`);
        else
            console.log(`${CYAN('[content match]')} ${r.file} ${GRAY(r.line)}`);
        });
        if (found.length > 8)
        console.log(GRAY(`...and ${found.length - 8} more. Try a narrower query.`));
        process.exit(0);
    }

    // --- NEW: Word-wise search (if nothing found at all)
    const words = query.split(' ').filter(Boolean);
    let somethingFound = false;
    for (const word of words) {
        const w = word.toLowerCase();
        const matches = symbols.filter(
        entry =>
            (entry.name && entry.name.toLowerCase().includes(w)) ||
            (entry.description && entry.description.toLowerCase().includes(w)) ||
            (entry.file && entry.file.toLowerCase().includes(w))
        );
        const srcMatches = fallbackContentSearch(srcDir, 99, w);
        const testMatches = fallbackContentSearch(testsDir, 3, w);

        if (matches.length || srcMatches.length || testMatches.length) {
        somethingFound = true;
        console.log(YELLOW(`\nPartial matches for word "${word}":`));
        matches.slice(0, 5).forEach(e => {
            console.log(
            `- ${CYAN(e.name || '(unnamed)')} [${e.kind}] in ${GRAY(e.file)}\n  ${e.description || ''}`
            );
        });
        if (srcMatches.length) {
            srcMatches.slice(0, 2).forEach(r => {
            if (r.type === 'filename')
                console.log(`${CYAN('[src/filename match]')} ${r.file}`);
            else
                console.log(`${CYAN('[src/content match]')} ${r.file} ${GRAY(r.line)}`);
            });
            if (srcMatches.length > 2)
            console.log(GRAY(`...and ${srcMatches.length - 2} more src/ matches.`));
        }
        if (testMatches.length) {
            testMatches.slice(0, 2).forEach(r => {
            if (r.type === 'filename')
                console.log(`${CYAN('[tests/filename match]')} ${r.file}`);
            else
                console.log(`${CYAN('[tests/content match]')} ${r.file} ${GRAY(r.line)}`);
            });
            if (testMatches.length > 2)
            console.log(GRAY(`...and ${testMatches.length - 2} more tests/ matches.`));
        }
        }
    }
    if (!somethingFound) {
        console.log(RED(`No symbol matches found for: "${query}" and no fallback matches in src or tests for any query word.`));
    }
    process.exit(0);
    }

    // --- Print results (same as before)
    function analyzeMeta(results) {
    if (results.length < 2) return;
    const byFile = {};
    const paramTypes = new Set();
    const kinds = new Set();
    results.forEach(e => {
        if (e.file) byFile[e.file] = (byFile[e.file] || 0) + 1;
        if (e.kind) kinds.add(e.kind);
        if (e.params) e.params.forEach(p => paramTypes.add(p.type));
    });
    const files = Object.entries(byFile).sort((a, b) => b[1] - a[1]);
    if (files.length && files[0][1] > results.length * 0.4)
        console.log(GRAY(`Most matches are in: ${files[0][0]}`));
    if (paramTypes.size)
        console.log(GRAY(`Parameter types: ${Array.from(paramTypes).filter(Boolean).join(', ')}`));
    if (kinds.size)
        console.log(GRAY(`Kinds: ${Array.from(kinds).join(', ')}`));
    console.log('');
    }

    if (results.length > 1) analyzeMeta(results);

    results.slice(0, 14).forEach(e => {
    console.log(
        `- ${CYAN(e.name || '(unnamed)')} [${e.kind}] in ${GRAY(e.file)}\n  ${e.description || ''}`
    );
    printParamsAndReturns(e);
    console.log('');
    });
    if (results.length > 14)
    console.log(GRAY(`...showing top 14 of ${results.length} matches.`));

    if (results.length === 1 && results[0].name && results[0].file) {
    const filePath = results[0].file.replace(/^src\//, './src/');
    const func = results[0].name;
    const params = (results[0].params || []).map(p => p.name).join(', ');
    console.log(
        GRAY('\nExample usage:'),
        `\nimport { ${func} } from '${filePath}';\n// ${func}(${params})\n`
    );
    }
    if (results.length > 5)
    console.log(GRAY(`[Tip] To narrow further, try: just symbols-resolve "<another keyword>"`));

symbols-test-resolve:
    #!/usr/bin/env bash
    set -euo pipefail

    run_and_expect() {
        desc="$1"
        query="$2"
        shift 2
        expected=("$@")
        output=$(just symbols-resolve "$query" 2>&1 || true)
        echo ">>> $desc"
        echo "$output" | head -40

        for exp in "${expected[@]}"; do
            if echo "$output" | grep -Fq "$exp"; then
                echo "(PASS: found \"$exp\")"
                echo
                return 0
            fi
        done
        echo "❌ FAIL: None of expected patterns (${expected[*]}) found in output of: just symbols-resolve \"$query\""
        echo "=== Actual output ==="
        echo "$output"
        echo "=== End output ==="
        exit 1
    }

    run_and_expect "1. Fallback to tests"           "tests"         "Fallback matches in tests/"
    run_and_expect "2. Symbol match in symbols.json" "widgetStore"   "src/component/widget/widgetStore.js" "add [function]" "WidgetStore [class]"
    run_and_expect "3. Exact symbol match" "adjustWidgetSize" \
        "- adjustWidgetSize [function]" \
        "adjustWidgetSize [function]" \
        "import { adjustWidgetSize"
    run_and_expect "4. Partial, multiword fallback"  "DOM testing"   "Partial matches for word"
    run_and_expect "5. test: prefix direct search"   "test:drag"     "Fallback matches in tests/"
    run_and_expect "6. Useless query (not found)"    "nonexistentSYMBOLforSURE" "No symbol matches found"
    run_and_expect "7. Param search (see params)"    "addWidget"     "@param" "addWidget [function]"
    run_and_expect "8. Multiword, some found"        "drag potato drop" "Partial matches for word" "drag" "drop"

    echo "✅ All symbol-resolve tests passed!"
