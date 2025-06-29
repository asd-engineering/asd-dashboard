#!/usr/bin/env node
/**
 * Decode console / network / app logs for a test matched by NAME & BROWSER.
 * Usage: node playwright-extract-logs.js "<name substring>" "<browser-regex>"
 */
const [, , namePattern, browserPattern = '.*'] = process.argv
if (!namePattern) {
  console.error('Usage: node playwright-extract-logs.js "<name>" [browser-regex]')
  process.exit(1)
}
const report = JSON.parse(require('fs').readFileSync('playwright-report.json', 'utf8'))
const nameRe = new RegExp(namePattern, 'i')
const brwRe = new RegExp(browserPattern, 'i')

function * tests (suite, ancestry = []) {
  for (const s of suite.suites || []) yield * tests(s, ancestry.concat(suite.title))
  for (const spec of suite.specs || []) {
    for (const t of spec.tests) {
      yield {
        test: t,
        title: ancestry.concat(suite.title, spec.title).filter(Boolean).join(' › ')
      }
    }
  }
}

for (const s of report.suites) {
  for (const { test, title } of tests(s)) {
    if (!nameRe.test(title) || !brwRe.test(test.projectName)) continue
    const r0 = test.results[0] || {}
    console.log(`\n=== ${title} (${test.projectName}) [${r0.status}] ===`);
    (r0.attachments || []).forEach(att => {
      if (att.contentType === 'application/json') {
        const body = Buffer.from(att.body, 'base64').toString('utf8')
        console.log(`\n--- ${att.name} ---\n`, JSON.parse(body))
      }
    })
  }
}
