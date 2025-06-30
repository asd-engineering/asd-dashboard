# Codex Agent Development Strategy

## 🧠 AI Agent Roles & Responsibilities

| Agent                        | Responsibility                                              | Inputs                                                   | Outputs                                         |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| 🛠️ **DevelopmentAgent**     | Implements features from structured logs → passing tests    | Logs (`playwright-report-index.json.gz`), symbols, tests | Clean JS, passing tests, updated `symbols.json` |
| 📦 **LoggerAttacher**        | Ensures structured logging (`Logger`) in UI modules         | `Logger.js`, UI modules                                  | Structured logs in Playwright reports           |
| 🧬 **SymbolIndexMaintainer** | Keeps canonical `symbols.json` always updated               | JS sources                                               | Accurate `symbols.json`                         |
| 💪 **TestInspector**         | Executes & indexes Playwright tests for Codex introspection | `.spec.ts`, Playwright commands                          | `playwright-report-index.json.gz`               |
| ✅ **ValidationAgent**        | Validates symbols, tests, logs before commit                | `symbols.json`, tests, logs, JSDoc, lint                 | Commit-ready PRs with clear QA summaries        |

---

## ⚧️ AI Agent Constraints

* **Client-side only** (DOM APIs, localStorage, fetch).
* **No frameworks/transpilers/build tools**. Pure ES6+ Vanilla JS.
* **Functional-Core, OO-Shell**:

  * Pure, stateless core logic
  * Minimal UI orchestration via classes/objects

---

## 📁 File & Folder Structure (Canonical)

```
.
├── AGENTS.md
├── src/                                  # JS sources
│   ├── component/                        # UI orchestration
│   ├── storage/                          # Browser storage
│   ├── ui/                               # Styles & resources
│   ├── utils/                            # Common utilities (Logger.js)
│   ├── main.js                           # App bootstrap
│   └── serviceWorker.js                  # Offline support
├── symbols.json                          # Canonical symbol index
├── playwright-report-index.json.gz       # Indexed summary with structured logs
├── playwright-report.json                # Full report (read via indexing script)
├── playwright-report/                    # HTML reports (Codex: do not read)
├── test-results/                         # Videos only (Codex: do not read)
├── webserver.log                         # From `serve_no_cache.js`, useful if files missing
├── justfile                              # Commands interface
├── scripts/
│   ├── extract-symbol-index.mjs
│   ├── playwright-indexer.js             # Creates playwright-report-index.json.gz
│   ├── playwright-extract-logs.js        # Extract logs from index
│   └── just/playwright.just              # Justfile extensions
└── tests/                                # Playwright tests (.spec.ts)
```

---

## 🔖 Symbol Extraction & Validation

Codex references **only canonical symbols** via `symbols.json`.

* **Never guess** function names, signatures, or return values.
* Symbols and JSDoc must exactly match actual declarations:

  ```js
  /**
   * Short description.
   * @function createBoard
   * @param {string} boardName
   * @returns {object}
   */
  ```

Update symbol index regularly:

```bash
just extract-symbols
# Alias: node scripts/extract-symbol-index.mjs
```

---

## 📋 Coding Guidelines

* Enforce strict **Single Responsibility Principle** (SRP).
* Explicit JSDoc-defined input/output contracts.
* Clear, descriptive camelCase naming.
* Include `// @ts-check` at the top of all files.
* Define reusable shapes via `@typedef`.

---

## 🗃️ Logging & Debugging (Structured)

* **Custom `Logger.js` only**, no direct `console.log`.
* Explicitly declare logger per module:

  ```js
  const logger = new Logger('moduleName.js');
  ```

Structured logs (`network`, `console`, `app`) are stored within Playwright reports only:

* Codex reads from compressed index (`playwright-report-index.json.gz`).
* Codex **does not read directly**:

  * `local/logs/*.json` (non-existent)
  * `playwright-report/` (HTML reports only)
  * `test-results/` (videos only)

---

## 🛠️ Automation & Formatting

Managed via **Justfile** commands:

| Command                | Action                                                      |
| ---------------------- | ----------------------------------------------------------- |
| `just start`           | Run dev server (`serve_no_cache.js`)                        |
| `just test`            | Execute all tests                                           |
| `just test-grep <tag>` | Execute specific tests                                      |
| `just format`          | Lint and autoformat                                         |
| `just extract-symbols` | Update `symbols.json`                                       |
| `just index-report`    | Create compressed index (`playwright-report-index.json.gz`) |

Linting and formatting:

```bash
npm run lint-fix
```

Output must always be ready-to-commit.

---

## Two-Phase AI-Driven Workflow

Codex agents follow a strict workflow:

### Test Execution

Generate structured logs:

```bash
just test
# or
npx playwright test --reporter=json
```

Handle environment/dependency errors clearly:

```plaintext
DEV-ENV-ERROR: playwright dependency missing
Proposed fix: npm install playwright
```

### Test Indexing & Inspection

Create indexed logs:

```bash
just index-report
```

Structured introspection:

```bash
just list '<regex>'             # List matching tests
just failures '<regex>'         # List failures only
just logs '<regex>' [browser]   # Extract & view logs
```

Always re-index after test runs.

---

## 📋 Playwright Report Helpers

Located at: [`scripts/just/playwright.just`](scripts/just/playwright.just)
Core scripts:

* `scripts/playwright-indexer.js`
* `scripts/playwright-extract-logs.js`

| Command                         | Purpose                          |
| ------------------------------- | -------------------------------- |
| `just index-report`             | Compress logs into indexed JSON  |
| `just list '<regex>'`           | List matching tests              |
| `just failures '<regex>'`       | List failing tests               |
| `just logs '<regex>' [browser]` | Decode structured logs for tests |

---

## 🌱 Extensibility & Resilience

* Design modular, config-driven interfaces.
* Enable symbolic navigation for simulation and validation.
* Avoid hard-coded paths or options; rely on configuration files.

---

## ❌ TypeScript Error Handling Policy

Codex may not patch TypeScript errors using blind type assertions like `as HTMLElement` or `as any`.

### 🧱 Rules:

* Always use `instanceof` or other runtime-safe guards:

  ```ts
  if (target instanceof HTMLInputElement) {
    console.log(target.value);
  }
  ```

* Never assume properties exist on `EventTarget`, `HTMLElement`, or `Element` without guard checks.

* Never silence errors via widening types unless validated by runtime contract.

* Avoid introducing regressions by validating every fix.

## 🔄 Iterative AI Validation (Continuous Loop)

Codex continuously validates with:

```bash
just extract-symbols
just test
just index-report
```

* Verifies symbol accuracy.
* Refactors based on logs and test outcomes.
* Ignores unindexed files unless explicitly regenerated.

---

## ✅ AI-Driven PR Validation & QA

**ValidationAgent** confirms PR quality by checking:

* Updated symbols (`symbols.json`)
* Passing tests
* Properly structured logs
* Formatted and linted code
