# Codex Agent Development Strategy

## AI Agent Role & Constraints

Codex AI exclusively implements all client-side logic for the VanillaJS dashboard. Follow these strict constraints:

* **No build tools, transpilers, frameworks, or preprocessors.**
* **Vanilla JavaScript (ES6+ modules)** directly executable in-browser.
* **Client-side only architecture** (use DOM APIs, localStorage, fetch).

---

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

* Keep files concise, each with clear responsibilities.
* Use descriptive filenames (`boardManagement.js`, `configModal.js`, etc).

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

* Enforce **Single Responsibility Principle** (SRP) strictly.
* Define **explicit input/output contracts** for every function.
* Use clear camelCase naming.
* Always include JSDoc with exact symbol name:

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

Structured logs are persisted to `window._appLogs` only when running inside Playwright.

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

---

## 🧪 Two-Phase Test Process

Codex must follow this strict sequence when analyzing tests or logs.

### Phase 1: Test Execution

*Runs the full suite and generates `playwright-report.json`, required for indexing.*

```bash
just test
# or: npx playwright test --reporter=json
```

### Phase 2: Test Indexing & Inspection

*Builds a fast-to-query, compressed log summary and enables AI log inspection.*

```bash
just index-report            # → playwright-report-index.json.gz
```

Then inspect with:

```bash
just list '<title-regex>'            # Filter by test name
just failures '<title-regex>'        # Show failing tests only
just logs '<title-regex>' [browser]  # View logs for matching test
```

---

## Playwright Report Helpers (Justfile)

### 1. List Results by Name (regex)

```bash
just list '<title-regex>'
```

* Filters `.fullTitle` (case-insensitive regex).
* Browser filtering is **not supported**.
* Use `\b` boundaries or `[^A-Za-z]` to avoid partial matches.

| Command                          | Output                                                              |
| -------------------------------- | ------------------------------------------------------------------- |
| `just list`                      | entire table                                                        |
| `just list 'drag.*drop'`         | all tests whose title contains “drag … drop” (including “Dropdown”) |
| `just list '\bdrag\b.*\bdrop\b'` | exact match for “drag and drop”                                     |

---

### 2. List Failures Only

```bash
just failures '<title-regex>'
```

Shows failing/flaky test runs only. Same title matching logic.

---

### 3. View Logs for One Test

```bash
just logs '<title-regex>' [browser-regex]
```

* Pretty-prints all structured logs:

  * `network-logs.json`
  * `console-logs.json`
  * `app-logs.json`
* Browser filter is optional.

Example:

```bash
just logs '\bdrag\b.*\bdrop\b' chromium
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

| Command                         | Purpose                          |
| ------------------------------- | -------------------------------- |
| `just index-report`             | Build compressed test index      |
| `just list '<regex>'`           | List tests filtered by title     |
| `just failures '<regex>'`       | List only failed tests           |
| `just logs '<regex>' [browser]` | Decode logs for matching test(s) |

---

## Extensibility & Resilience

* Design extensible interfaces for future AI plugins or widget marketplaces.
* Avoid hard-coded paths or options — prefer config-driven.
* Structure must enable simulation, test generation, and symbolic navigation.

---

## Iterative AI Validation

Codex must:

1. Periodically re-run:

   ```bash
   just extract-symbols
   just test
   just index-report
   ```
2. Validate symbol presence and test coverage.
3. Refactor or extend code based on failures or log patterns.
4. Ignore files not referenced in `symbols.json` unless regenerated explicitly.

---

By following this phased strategy, AI agents maintain full symbolic awareness, test-integrated feedback, and a fully browser-native, zero-boilerplate architecture.
<!--
🟢 Updated 2025-06-29:
- Split test execution into 2 phases (run vs. index)
- Clarified structured log commands
- Refined folder structure comments and command examples
-->