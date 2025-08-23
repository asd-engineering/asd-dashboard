# Codex Agent Development Strategy

## 🎯 The Golden Path — Standard Workflow

**Always start here. This workflow is optimized for fast grounding, minimal confusion, and test-driven validation.**

1. **Refresh the Symbol Index**  
   Ensures `symbols.json` reflects the latest source of truth, essential for reasoning.  
    ```bash
    just symbols-extract
    ```

Then:

* Open `symbols.json`
* Search for **keywords, service names, or UI concepts** from the task
* Use matches to identify **files**, **functions**, and **interfaces**
* Prioritize entries with **clear JSDoc** descriptions matching the problem domain

> 💡 Tip: Scan the `name`, `description`, and `file` fields, they’re the fastest route to relevant code.

2. **Implement Task Changes** guided by what you found in the symbol map.

3. **Format, Lint, and Type-Check**
(this also builds the indexed report automatically via the imported playwright.just recipe, db object called with zcat > jq: playwright-report-index.json.gz)
   ```bash
   just format check
   ```

4. **Run All Tests**

   ```bash
   just test
   ```

or previously failing test if you ran `just test` before

   ```bash
   just test-failed
   ```

5. **Commit** — if blocked by an unrelated pre-commit lint failure, you may bypass (last resort):

   ```bash
   HUSKY=0 git commit -m "..."
   ```

> 🔍 **Why symbols first?**
> `symbols.json` is the Codex agent’s navigation system.
> Run it early to replace slow guessing with high-fidelity code comprehension, grounded in actual names, files, and types.


## 🧠 AI Agent Roles & Responsibilities

| Agent                        | Responsibility                                                | Inputs                        | Outputs                                         | Function Calls                                  | Downstream Dependencies                           |
|-----------------------------|----------------------------------------------------------------|-------------------------------|--------------------------------------------------|--------------------------------------------------|----------------------------------------------------|
| 🧬 **SymbolIndexMaintainer** | Builds & surfaces a searchable mental map of the codebase     | JS source files               | `symbols.json`                                  | `just symbols-extract`                           | 🛠 DevelopmentAgent<br>✅ ValidationAgent            |
| 🔍 **SymbolResolver**        | Resolves human tasks to matching code symbols and locations   | `symbols.json`, keywords      | File/function/interface suggestions             | `just symbols <query>`                   | 🛠 DevelopmentAgent                                  |
| 🛠️ **DevelopmentAgent**     | Implements changes based on the task and symbol map           | Task prompt, `symbols.json`   | Updated source files                            | _manual edits_                                   | 🧼 LinterFormatter<br>🧪 TestAnalyzer                |
| 🧼 **LinterFormatter**       | Lints, auto-formats, and runs static type checks              | Updated source files          | Clean, typed codebase                           | `just format`, `just check`                      | ✅ ValidationAgent                                  |
| 🧪 **TestAnalyzer**          | Runs tests and generates indexed structured logs              | Codebase, `.spec.ts`          | `playwright-report-index.json.gz`               | `just test` <br> (includes index-report, list…)  | ✅ ValidationAgent                                  |
| ✅ **ValidationAgent**       | Final gatekeeper: verifies all QA surfaces                    | All artifacts from above      | Merge-ready PR                                  | _aggregates previous steps_                      | ⛔ Terminal                                          |

---

### 🆕 SymbolResolver Agent – Integration with the Golden Path

Right after `just symbols-extract`, use:

```bash
just symbols "<your task keywords>"
```

This command:

* Searches `symbols.json` for **name**, **description**, and **file** matches.
* Falls back to scanning `src/` and `tests/` if no symbols exist (or it's a new repo).
* Handles multiword fallbacks and test-specific queries like `test:drag`.
* Supports rapid **task → symbol** resolution without scanning the tree manually.

## ⚧️ AI Agent Constraints

* **Client‑side only** (DOM APIs, `localStorage`, `fetch`).
* **Pure Vanilla ES6+** — no frameworks, transpilers, or build tools.
* **Functional‑Core / OO‑Shell**

  * Pure, stateless core logic.
  * Minimal UI orchestration via classes/objects.

## 🧭 Mental‑Map Landmarks (Architecture & Key Files)

> *Use this table first to avoid the “cold‑start” mapping cost seen in prior runs.*

| Path                               | Why it matters                                                 |
| ---------------------------------- | -------------------------------------------------------------- |
| `src/main.js`                      | App bootstrap — read this first.                               |
| `src/storage/localStorage.js`      | **Single source of persisted truth** (boards, views, widgets). |
| `src/storage/servicesStore.js`     | In‑memory service catalogue.                                   |
| `src/board/boardManagement.js`     | Core board/view logic — used by most features.                 |
| `src/component/widget/…`           | Drag‑drop & widget orchestration.                              |
| `src/utils/Logger.js`              | **Only** logging API (structured).                             |
| `symbols.json`                     | Canonical symbol map — **never guess** signatures.             |
| `playwright-report-index.json.gz`  | Indexed logs — primary failure‑diagnosis source.               |
| `justfile` + `scripts/just/*.just` | All automation shortcuts.                                      |


## 📁 File & Folder Structure (Canonical)

.
├── AGENTS.md
├── src/
│   ├── component/                # UI orchestration
│   ├── storage/                  # Browser storage
│   ├── ui/                       # Styles & resources
│   ├── utils/                    # Common utilities (Logger.js)
│   ├── main.js                   # App bootstrap
│   └── serviceWorker.js          # Offline support
├── symbols.json                  # Canonical symbol index
├── playwright-report-index.json.gz
├── playwright-report.json
├── playwright-report/            # HTML (Codex: do not read)
├── test-results/                 # Videos only (Codex: do not read)
├── webserver.log                 # From serve_no_cache.js
├── justfile                      # Command interface
├── scripts/
│   ├── extract-symbol-index.mjs
│   ├── playwright-indexer.js
│   ├── playwright-extract-logs.js
│   └── just/playwright.just
└── tests/                        # Playwright `.spec.ts`
```

## 🔖 Symbol Extraction & Validation

Codex references **only canonical symbols** via `symbols.json`.

* **Never guess** names, signatures, or return values.
* JSDoc must exactly match declarations:

  ```js
  /**
   * Short description.
   * @function createBoard
   * @param {string} boardName
   * @returns {object}
   */
  ```

Refresh index:

```bash
just symbols-extract
# alias: node scripts/extract-symbol-index.mjs
# updates: symbols.json
```

## 📋 Coding Guidelines

* Strict **Single Responsibility Principle (SRP)**.
* Explicit **JSDoc** I/O contracts.
* Descriptive camelCase naming.
* `// @ts-check` at top of every file.
* Reusable shapes via `@typedef`.

## 🗃️ Structured Logging & Debugging

```js
const logger = new Logger('moduleName.js');
```

* **No `console.log`** only `Logger.js`.
* Structured logs (`network`, `console`, `app`) live inside Playwright reports and are accessed via the index(playwright-report-index.json.gz).

| Command                         | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `just index-report`             | Compress raw logs into the indexed summary. |
| `just list '<regex>'`           | List tests in the index.                    |
| `just failures '<regex>'`       | List failing tests only.                    |
| `just logs '<regex>' [browser]` | Decode structured logs.                     |

## 🛠️ Tooling & Environment Gotchas

| Gotcha                                  | Fix                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| **JSDoc tagging for `symbols-extract`** | Every module needs `/** @module … */`; every exported fn needs `/** @function … */`. |
| **`just` working dir**                  | All paths in `justfile` are **repo‑root** relative.                                  |
| **Linter browser globals**              | Declare missing globals (e.g. `HTMLElement`) in `package.json → standard.globals`.   |
| **TypeScript (`// @ts-check`)**         | Use runtime guards (`instanceof`, `"prop" in obj`) — **never** blind casts.          |
| **Pre‑commit hooks**                    | Use `HUSKY=0` only when lint failures are unrelated to your change.                  |

## 🌱 Extensibility & Resilience

* Design **modular, config‑driven** interfaces (no hidden globals).
* Enable **symbolic navigation** so agents & tests can traverse code.
* **Avoid hard‑coded paths**; rely on configuration files and dynamic lookups.
* Architect for **simulation & validation** (functional‑core makes logic testable).
* Keep UI orchestration thin; heavy logic lives in pure modules for easy refactor.
* **Fail fast & loudly** — surface environment errors with actionable fixes.
* Target **small, composable files** (≤ 50 LOC), facilitating AI refactors.
* **Prefer data‑oriented designs** over deep object hierarchies.
* Write **idempotent scripts** (safe to rerun without side effects).

## ❌ TypeScript Error‑Handling Policy

* Guard properties with `instanceof`, `"prop" in obj`, optional‑chaining, etc.
* **Never** widen types with `as HTMLElement` / `as any` unless runtime‑checked.
* Every fix must keep tests green **and** TypeScript clean.

## 📊 Observed Failure Modes & Mitigations

| Failure Mode                                     | Mitigation                                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Cold‑start mapping cost** | Consult *Mental‑Map* table first.                                                                                                      |
| **Tooling gotchas** | Revisit *Gotchas* when script/lint errors appear.                                                                                      |
| **Architectural ambiguity** | Remember: state‑driven UI; avoid direct DOM; locate new logic in the matching `board/` or `widget/` module.                            |
| **Flaky tests timing out on navigation/clicks** | Avoid `page.waitForNavigation()`. Use the explicit `action -> wait for state` pattern. See *Playwright Best Practices* section below. |

## 🧪 Playwright Best Practices & Anti-Patterns

To maintain a fast and stable test suite, agents must avoid common race conditions. This application is a Single-Page App (SPA) that re-renders and reloads quickly; traditional waiting strategies are unreliable.

### Anti-Pattern: `page.waitForNavigation()`

Do not use `page.waitForNavigation()` for actions that trigger client-side updates or fast page reloads. It waits for the `load` event, which may not fire predictably in an SPA, leading to timeouts.

**INCORRECT (Flaky):**

```typescript
// 🚨 ANTI-PATTERN: This creates a race condition and will time out.
await Promise.all([
  page.waitForNavigation(),
  page.click('#switch-environment')
]);
```

**CORRECT (Reliable):**
The proper sequence is to **perform the action first**, then **wait for a specific application-level signal** that indicates the UI is ready. Our application provides a `data-ready="true"` attribute on the `<body>` for this purpose.

```typescript
// ✅ BEST PRACTICE: Act, then wait for the app to be ready.
await page.click('#switch-environment');

// Wait for the DOM to be available after the reload.
await page.waitForLoadState('domcontentloaded');

// Wait for our application's specific signal that hydration is complete.
await page.waitForFunction(() => document.body.dataset.ready === 'true');
```

This pattern is deterministic, fast, and resilient to variations in execution speed. Apply it to **any** test step that causes a full or partial page reload.

## ✅ AI‑Driven PR Validation & QA

**ValidationAgent** blocks merge unless:

* `symbols.json` updated & canonical.
* All tests green.
* Logs present & structured.
* Lint/format clean.
* Commit message clear.
