# Codex

## OpenAI Codex teams environment

```bash
# Install core dependencies
apt update
apt install -y lsof vim-common psmisc net-tools iproute2 jq just tree

# Install Node dependencies
npm install

# Install only Chromium and Firefox (not WebKit)
npx playwright install chromium firefox

# Install OS-level dependencies needed for browser automation
npx playwright install-deps
```

## Tips and Tricks for OpenAI Codex Teams

## Extracting and Analyzing Codex Reasoning Logs

To improve Codex agent behavior, I built a manual feedback loop around **log introspection + AI-assisted agent refinement**. This allows you to iteratively refine your `AGENTS.md` specs based on observed thinking patterns and mistakes.

---

### Step 1: Extract AI Thought Logs from the Codex UI

Run this in your browser console while reviewing a Codex session. It finds all natural language "thoughts" (ignoring shell/code output) and exports them as a JSON blob:

```javascript
(async () => {
  const delay = ms => new Promise(r => setTimeout(r, ms));
  const MAX_TASKS = 5;
  const logResults = [];

  let exportedCount = 0;
  let taskIndex = 0;

  while (exportedCount < MAX_TASKS) {
    // Refetch task anchors on every iteration
    const taskAnchors = Array.from(document.querySelectorAll('div.task-row-container a[href^="/codex/tasks/"]'))
      .filter((a, i, self) => self.findIndex(x => x.href === a.href) === i); // dedupe

    if (taskIndex >= taskAnchors.length) {
      console.log('✅ No more tasks in list.');
      break;
    }

    const anchor = taskAnchors[taskIndex++];
    const container = anchor.closest('a');
    const isRunning = container?.querySelector('.loading-shimmer-pure-text');
    if (isRunning) {
      console.log(`⏩ Skipping running task: ${anchor.href}`);
      continue;
    }

    console.log(`▶ Opening task ${exportedCount + 1}: ${anchor.href}`);
    anchor.click();
    await delay(1500);

    // Try to find the Logs button (question-only tasks won't have it)
    let logsBtn = null;
    for (let i = 0; i < 20; i++) {
      logsBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Logs');
      if (logsBtn) break;
      await delay(300);
    }

    if (!logsBtn) {
      console.warn(`❓ No Logs tab found: skipping ${anchor.href}`);
      const backBtn = Array.from(document.querySelectorAll('button')).find(b =>
        b.querySelector('svg path[d^="M8.801"]')
      );
      if (backBtn) backBtn.click();
      else console.warn('⚠ No back button found — aborting');
      await delay(1500);
      continue;
    }

    logsBtn.click();
    await delay(1000);

    // Extract AI reasoning logs
    const entries = Array.from(document.querySelectorAll('div.markdown p'))
      .map(p => {
        const text = p.innerText.trim();
        const container = p.closest('.grid');
        const isTerminalBlock = el =>
          el.querySelector('code, pre') !== null &&
          el.innerText.includes('root@') &&
          el.innerText.includes('#');
        if (!text || !container || isTerminalBlock(container)) return null;
        return { text };
      })
      .filter(Boolean);

    logResults.push({
      task: anchor.href,
      logs: entries
    });

    exportedCount++;

    // Go back to task list (SPA-safe)
    const backBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.querySelector('svg path[d^="M8.801"]')
    );

    if (!backBtn) {
      console.warn('⚠ Could not find back button. Exiting.');
      break;
    }

    backBtn.click();
    await delay(1500);
  }

  // Export logs as JSON blob
  const blob = new Blob([JSON.stringify(logResults, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `codex-logs-${Date.now()}.json`
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
})();
```

---

### Step 2: Merge Logs

If you run this across multiple sessions, merge all JSON files (e.g., using a `justfile` target or simple `jq` script):

```bash
jq -s 'flatten' *.json > merged-codex-thoughts.json
```

---

### Step 3: Use AI to Discover Reasoning Flaws

Upload `merged-codex-thoughts.json` into **Gemini Pro in AI Studio** (chosen for its high context limit and document comprehension quality). Prompt it with:

> “Summarize common reasoning errors or flawed assumptions in these log lines. Highlight recurring misunderstandings, bias, hallucinations, or state-tracking problems.”

---

### Step 4: Regenerate `AGENTS.md` with AI Guidance

Feed both your current `AGENTS.md` and the identified issues back into Gemini:

> “Here’s my current AGENTS.md. Do **not** treat this as a ruleset — treat it as a living document under revision. Based on the flaws in reasoning we found, suggest modifications or design changes to improve agent accuracy and robustness.”

Apply the diffs manually or via Codex-backed edits, preserving prior authorial notes (as per team convention).

---

### Result

This flow gives you:

* A **ground-truth corpus** of AI thought patterns
* An **automated analysis** of recurring missteps
* A directly **actionable plan** for agent evolution

It closes the loop between **execution logs** and **agent spec design**, improving Codex quality incrementally without relying on post-hoc intuition alone.

## Multi-Version UI Diff Extraction (Automated Scraping)

This section documents the recommended approach for **extracting all file diffs across Codex browser versions** (as shown in the web UI) using an automated, event-driven script. This enables rapid AI analysis or bulk review of code changes across multiple "Version N" states.

### **Rationale**

* **Why automate?**
  Manual copying is error-prone and slow. The UI exposes all data but only one version at a time.
* **Why browser scripting, not API?**
  Diffs are often embedded in complex, client-side rendered UIs. A robust browser console script is universally portable, requires no backend hooks, and works regardless of framework churn—as long as DOM structure and class names are stable.
* **Why not just static waits?**
  Reliable extraction must synchronize with UI state—not guess with hardcoded delays.

---

### **Process Summary**

1. **Identify all visible "Version N" buttons** in the UI (matching text: `Version 1`, `Version 2`, etc.).
2. **For each version, in DOM order:**

   * If the version is not already active, click it and wait until it becomes active (CSS class check).
   * If the "Diff" tab is not active, click it and wait until it becomes active.
   * Once both are confirmed active, extract all visible diff data for that version.
3. **Accumulate all extracted data** in a single JSON object keyed by version label.
4. **Trigger a JSON download** once all versions are processed.

---

### **Key Implementation Notes**

* **No Unnecessary Waits:**
  The script checks active state for both version and diff tab. Only clicks and waits if not already selected, making the crawl as fast as the UI allows.
* **Self-Validation:**
  Throws errors (with clear messages) if expected UI changes do not occur, e.g., class changes or diff DOM mutation. Never silently skips failures.
* **Portable:**
  Requires only the browser console, no browser extensions or dev environment setup.
* **Output:**
  One JSON file, root is an object:

  ```json
  {
    "_meta": { ... },
    "Version 1": { ...diffs... },
    "Version 2": { ...diffs... },
    ...
  }
  ```

---

### **Usage**

1. **Open the Codex diff UI** in your browser.
2. **Open DevTools > Console.**
3. **Paste the script** from `docs/scripts/codex-multiversion-diff-scraper.js` (or see below).
4. **Press Enter.**
5. When the script completes, a download prompt for `git-diff-multiversion.json` will appear.

---

#### **Current Script Reference**

```js
(function () {
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  async function waitForActive(el, className, timeout = 4000, interval = 60) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (el.classList.contains(className)) return;
      await sleep(interval);
    }
    throw new Error(`Element "${el.textContent.trim()}" did not activate (${className})`);
  }
  async function waitForDiffContentChange(refHtml, timeout = 7000, interval = 60) {
    const area = 'div[data-diff-header]';
    const start = Date.now();
    while (Date.now() - start < timeout) {
      let html = Array.from(document.querySelectorAll(area)).map(x => x.innerHTML).join('');
      if (html && html !== refHtml) return;
      await sleep(interval);
    }
    throw new Error(`Diff content did not update in time`);
  }
  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  function scrapeGitDiffs() {
    const activeBtn = document.querySelector('div.flex > span > button.text-token-text-primary');
    const result = {
      timestamp: new Date().toISOString(),
      sourceUrl: window.location.href,
      version: activeBtn ? activeBtn.textContent.trim() : null,
      diffs: [],
    };
    document.querySelectorAll('div[data-diff-header]').forEach(container => {
      const fileDiff = {
        filePath: container.dataset.diffHeader,
        additions: container.querySelector('.text-green-500')?.textContent.trim() || null,
        deletions: container.querySelector('.text-red-500')?.textContent.trim() || null,
        changes: [],
      };
      container.querySelectorAll('.diff-table-body tr.diff-line').forEach(row => {
        fileDiff.changes.push({
          old: {
            lineNumber: row.querySelector('.diff-line-old-num')?.textContent.trim() || null,
            content: row.querySelector('.diff-line-old-content .diff-line-syntax-raw')?.textContent ?? null,
          },
          new: {
            lineNumber: row.querySelector('.diff-line-new-num')?.textContent.trim() || null,
            content: row.querySelector('.diff-line-new-content .diff-line-syntax-raw')?.textContent ?? null,
          }
        });
      });
      result.diffs.push(fileDiff);
    });
    return result;
  }

  (async function () {
    const versionBtns = Array.from(document.querySelectorAll('div.flex > span > button'))
      .filter(btn => /^Version \d+$/.test(btn.textContent.trim()));
    if (!versionBtns.length) throw new Error('No version buttons found.');
    const allVersionDiffs = {
      _meta: {
        extractedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        versionCount: versionBtns.length
      }
    };

    for (const btn of versionBtns) {
      const label = btn.textContent.trim();
      const wasActive = btn.classList.contains('text-token-text-primary');
      if (!wasActive) {
        const beforeHtml = Array.from(document.querySelectorAll('div[data-diff-header]')).map(x => x.innerHTML).join('');
        btn.click();
        await waitForActive(btn, 'text-token-text-primary', 5000);
        await waitForDiffContentChange(beforeHtml, 7000);
      }
      // Always select Diff tab if not already
      const diffNav = document.querySelector('div.flex.gap-4.text-sm.font-medium.border-b');
      const diffBtn = Array.from(diffNav.querySelectorAll('span > button')).find(b => b.textContent.trim().toLowerCase() === 'diff');
      if (!diffBtn) { console.warn(`No 'Diff' tab for ${label}. Skipping.`); continue; }
      if (!diffBtn.classList.contains('text-token-text-primary')) {
        const beforeDiffHtml = Array.from(document.querySelectorAll('div[data-diff-header]')).map(x => x.innerHTML).join('');
        diffBtn.click();
        await waitForActive(diffBtn, 'text-token-text-primary', 3000);
        await waitForDiffContentChange(beforeDiffHtml, 7000);
      }
      // Scrape instantly
      const scraped = scrapeGitDiffs();
      allVersionDiffs[label] = scraped;
      console.log(`[GitDiffScraper] ${label} scraped (${scraped.diffs.length} file diffs).`);
    }

    const nonEmpty = Object.values(allVersionDiffs).some(obj =>
      obj && typeof obj === 'object' && Array.isArray(obj.diffs) && obj.diffs.length > 0
    );
    if (nonEmpty) {
      downloadJSON(allVersionDiffs, 'git-diff-multiversion.json');
      console.log('[GitDiffScraper] All versions processed. Data:', allVersionDiffs);
    } else {
      console.warn('[GitDiffScraper] No diffs extracted from any version. No file downloaded.');
      console.log('Extracted data:', allVersionDiffs);
    }
  })();
})();
```

All other logic is preserved, just the diff data per file is now a single text blob.
This reduces +/- 60% of the output without losing contect or code changes.

```javascript
(function () {
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function waitForVersionActivation(expectedLabel, timeout = 5000, interval = 60) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const activeBtn = document.querySelector('div.flex > span > button.text-token-text-primary');
      if (activeBtn?.textContent.trim() === expectedLabel) return;
      await sleep(interval);
    }
    throw new Error(`Version "${expectedLabel}" did not become active`);
  }

  async function waitForDiffContentChange(refHtml, timeout = 7000, interval = 60) {
    const area = 'div[data-diff-header]';
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const nodes = document.querySelectorAll(area);
      if (nodes.length > 0) break;
      await sleep(interval);
    }

    while (Date.now() - start < timeout) {
      const html = Array.from(document.querySelectorAll(area)).map(x => x.innerHTML).join('');
      if (html && html !== refHtml) return;
      await sleep(interval);
    }

    throw new Error(`Diff content did not update in time`);
  }

  async function ensureDiffTabActive(timeout = 4000) {
    const tabBtn = Array.from(document.querySelectorAll('button[aria-label="Tab to view the code diff"]'))[0];
    if (!tabBtn) throw new Error('Diff tab not found');

    if (!tabBtn.classList.contains('text-token-text-primary')) {
      const beforeHtml = Array.from(document.querySelectorAll('div[data-diff-header]')).map(x => x.innerHTML).join('');
      tabBtn.click();
      await waitForActive(tabBtn, 'text-token-text-primary', timeout);
      await waitForDiffContentChange(beforeHtml, timeout + 2000);
    }
  }

  async function waitForActive(el, className, timeout = 4000, interval = 60) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (el.classList.contains(className)) return;
      await sleep(interval);
    }
    throw new Error(`Element "${el.textContent.trim()}" did not activate (${className})`);
  }

  function scrapeGitDiffsTextOnly() {
    const activeBtn = document.querySelector('div.flex > span > button.text-token-text-primary');
    const result = {
      timestamp: new Date().toISOString(),
      sourceUrl: window.location.href,
      version: activeBtn ? activeBtn.textContent.trim() : null,
      diffs: [],
    };
    document.querySelectorAll('div[data-diff-header]').forEach(container => {
      const diffText = Array.from(container.querySelectorAll('.diff-table-body tr.diff-line'))
        .map(row => row.innerText || '').join('\n');
      result.diffs.push({
        filePath: container.dataset.diffHeader,
        additions: container.querySelector('.text-green-500')?.textContent.trim() || null,
        deletions: container.querySelector('.text-red-500')?.textContent.trim() || null,
        diffText,
      });
    });
    return result;
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  (async function () {
    const versionBtns = Array.from(document.querySelectorAll('div.flex > span > button'))
      .filter(btn => /^Version \d+$/.test(btn.textContent.trim()));
    if (!versionBtns.length) throw new Error('No version buttons found.');

    const allVersionDiffs = {
      _meta: {
        extractedAt: new Date().toISOString(),
        sourceUrl: window.location.href,
        versionCount: versionBtns.length,
      }
    };

    for (const btn of versionBtns) {
      const label = btn.textContent.trim();
      const wasActive = btn.classList.contains('text-token-text-primary');

      try {
        if (!wasActive) {
          btn.click();
          await waitForVersionActivation(label, 5000);
        }

        const hasDiffTab = !!document.querySelector('button[aria-label="Tab to view the code diff"]');
        if (!hasDiffTab) {
          console.warn(`[GitDiffScraper] ${label} has no Diff tab. Skipping.`);
          allVersionDiffs[label] = { error: 'No diff available' };
          continue;
        }

        await ensureDiffTabActive();

        const scraped = scrapeGitDiffsTextOnly();
        allVersionDiffs[label] = scraped;
        console.log(`[GitDiffScraper] ${label} scraped (${scraped.diffs.length} file diffs).`);
      } catch (err) {
        console.error(`[GitDiffScraper] ${label} failed:`, err);
        allVersionDiffs[label] = { error: err.message };
      }
    }

    const nonEmpty = Object.values(allVersionDiffs).some(
      obj => obj && typeof obj === 'object' && Array.isArray(obj.diffs) && obj.diffs.length > 0
    );

    if (nonEmpty) {
      downloadJSON(allVersionDiffs, 'git-diff-multiversion.json');
      console.log('[GitDiffScraper] All versions processed. Data:', allVersionDiffs);
    } else {
      console.warn('[GitDiffScraper] No diffs extracted from any version. No file downloaded.');
      console.log('Extracted data:', allVersionDiffs);
    }
  })();
})();
```

---

### **Best Practices**

* **Always inspect DOM selectors** in your running Codex UI before updating or rerunning this script; selectors may shift if the UI changes.
* **Do not over-automate**: This script will only extract what is loaded in the current UI session.
