# Codex Agent Development Strategy

## AI Agent Role & Constraints

Codex AI exclusively implements all client-side logic for the VanillaJS dashboard. Follow these strict constraints:

* **No build tools, transpilers, frameworks, or preprocessors.**
* **Vanilla JavaScript (ES6+ modules)** directly executable in-browser.
* **Client-side only architecture** (use DOM APIs, localStorage, fetch).

## Optimal Development Strategy

### Functional-Core, OO-Shell

* **Core Logic (Pure & Stateless)**: Encapsulate business logic into small, pure JavaScript functions.
* **Shell (Imperative/OOP)**: Use objects/classes minimally for orchestrating UI interactions and module connections.

---

## Symbol Extraction for Codex Intelligence

Codex AI must **read `symbols.json`** as a canonical, up-to-date symbol index.

**NEVER guess function names, signatures, types or return values.**  
Instead:

1. Always reference the latest `symbols.json` during reasoning, refactoring, or code generation.
2. Use symbol metadata to resolve function names, kind (`function`, `class`, `const`), params, and return types.
3. When writing new code or updating existing files:
   - Always write proper **JSDoc blocks**
   - Ensure each block includes one of:
     - `@function <name>`
     - `@class <name>`
     - `@const <name>`
   - JSDoc must reflect actual declaration exactly (no aliases or inferred names).

To regenerate the index after changes:

```bash
just extract-symbols
# Alias for:
# node scripts/extract-symbol-index.mjs
````

This command outputs:

* `symbols.json` – machine-readable symbol index used by Codex
* `SYMBOL_INDEX.md` (optional) – human-readable overview

If `symbols.json` is missing or out-of-date, Codex code generation and refactoring is considered invalid.

---

## File & Folder Structure (AI-Friendly)

* Keep files concise, each with clear responsibilies.
* Descriptive filenames (`boardManagement.js`, `configModal.js`).

```
src/
├── component/              # UI orchestration modules
│   ├── board/
│   ├── dialog/
│   ├── menu/
│   ├── modal/
│   ├── utils/
│   ├── view/
│   └── widget/
├── storage/                # Browser storage utilities
├── ui/                     # Styles and UI-specific resources
├── utils/                  # Generic helpers (logging, fetching)
├── main.js                 # App bootstrap
└── serviceWorker.js        # Offline support

tests/                      # Playwright AI-generated tests
├── data/
├── shared/
└── *.spec.ts
```

---

## Coding Guidelines

* **Single Responsibility Principle (SRP)** strictly enforced.
* Explicit interfaces: clearly define inputs/outputs per function.
* Self-explanatory naming conventions (camelCase).
* **Always write JSDoc blocks**:

  ```js
  /**
   * Short description.
   * @function createBoard
   * @param {string} boardName - Display name.
   * @returns {object}
   */
  ```
* Use `@typedef` for custom shapes and reuse consistently.
* Place `// @ts-check` at top of all files.
* Always generate/update `symbols.json` with `just extract-symbols`.

---

## Logging and Debugging

* Use the custom `Logger` utility — no `console.log` allowed.
* Declare at module top level:

  ```js
  const logger = new Logger('widgetModal.js')
  ```

---

## Automation & Formatting

* Use `Justfile`:

  * `just start`, `just test`, `just test-grep <tag>`, `just format`, `just extract-symbols`
* Lint and autoformat:

  ```bash
  npm run lint-fix
  ```
* Output must always be ready to commit & test.

---

## Test-Driven Features

* Generate or update Playwright `.spec.ts` tests alongside every feature.
* **All tests must pass.**
* After running `just test`, AI must read the generated `playwright-report.json` to extract test outcomes and failure details for in-agent validation.
* Run tests with `just test` or use `just test-grep <tag>` for targeted runs.

## Playwright Report Helpers  (Justfile)

After running `just test`, Codex (or any automation) should build a compact
index of the huge Playwright report:

```bash
just index-report            # → playwright-report-index.json.gz
````

This gzip-compressed file holds one JSON row per test (per browser), making
queries fast and avoiding the HTML viewer.

### 1  List Results by Name (regex)

```bash
just list '<title-regex>'
```

* **Filters only on `.fullTitle`** (case-insensitive regex).
* Browser filtering is **not** supported (use title regexes only).
* Passing no regex lists every test.

Examples:

| Command                          | Output                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `just list`                      | entire table                                                                                 |
| `just list 'drag.*drop'`         | all tests whose title contains “drag … drop” (including “Dropdown” unless you tighten regex) |
| `just list '\bdrag\b.*\bdrop\b'` | **one** row for the “drag and drop” test, avoids “Dropdown”                                  |

> **Regex tip:** use `\bword\b` boundaries or `drag[^A-Za-z]*drop` to avoid
> matching titles like “Dropdown”.

### 2  List Failures Only

```bash
just failures '<title-regex>'
```

Same title filter, but pre-filters rows where `status != "passed"`.

Example:

```bash
just failures
# failed  chromium  addManageWidgets.spec.ts › Widgets › should be able to add 4 services and drag and drop 🤏
```

### 3  View Logs for One Test

```bash
just logs '<title-regex>' [browser-regex]
```

* The helper script still accepts an optional *browser regex* for convenience,
  but the main index queries remain title-based.
* It decodes and pretty-prints `console-logs`, `network-logs`, and `app-logs`
  attachments.

Example:

```bash
just logs '\bdrag\b.*\bdrop\b'
```

Output (trimmed):

```
=== addManageWidgets.spec.ts › Widgets › should be able to add 4 services and drag and drop 🤏 (chromium) ===

--- network-logs ---
[ { url: 'http://localhost:8000/', status: 200 }, … ]

--- console-logs ---
[ { type: 'log', text: 'All caches cleared' }, … ]
```

---

### Quick Reference

| Command                         | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `just index-report`             | Build compressed index                  |
| `just list '<regex>'`           | List tests filtered by title            |
| `just failures '<regex>'`       | List only failing tests                 |
| `just logs '<regex>' [browser]` | Decode logs for the first matching test |

**Important:** Title filtering is regex-based and case-insensitive; browser
filtering is *not* built into `list`/`failures`. Use precise regex boundaries
to avoid unintended matches.

---

## Extensibility & Resilience

* Design extensible interfaces for future AI plugins or widget marketplaces.
* Avoid hard-coded paths or options — prefer config-driven.
* Structure must enable simulation, test generation, and symbolic navigation.

---

## Iterative AI Validation

* Codex must periodically regenerate `symbols.json` and simplify/refactor existing code.
* All modifications must be traceable to a symbol in `symbols.json`.
* Files not in the symbol index are ignored from future AI updates unless explicitly regenerated.

---

By following this strategy, AI agents maintain full symbolic awareness, type safety, and scalable architecture — without requiring TypeScript or compilation.
