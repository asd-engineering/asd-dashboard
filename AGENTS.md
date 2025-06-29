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

  * `just start`, `just test`, `just format`, `just extract-arch`
* Lint and autoformat:

  ```bash
  npm run lint-fix
  ```
* Output must always be ready to commit & test.

---

## Test-Driven Features

* Generate or update Playwright `.spec.ts` tests alongside every feature.
* **All tests must pass.**

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

