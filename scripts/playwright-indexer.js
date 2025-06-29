#!/usr/bin/env node
/**
 * Compresses Playwright's huge JSON report into a greppable summary.
 *  - One row per test *per browser*
 *  - Keys: fullTitle (suite › spec), browser, status, duration, id, file, attachments
 *  - Output: playwright-report-index.json.gz
 */
const fs = require('fs')
const zlib = require('zlib')
const rpt = JSON.parse(fs.readFileSync('playwright-report.json', 'utf8'))

const rows = []

const walk = (suite, path = []) => {
  (suite.suites || []).forEach(s => walk(s, [...path, suite.title]));
  (suite.specs || []).forEach(spec => {
    spec.tests.forEach(t => {
      const r0 = t.results[0] || {}
      rows.push({
        id: t.id,
        file: spec.file,
        browser: t.projectName,
        fullTitle: [...path, suite.title, spec.title].filter(Boolean).join(' › '),
        status: r0.status,
        duration: r0.duration,
        attachments: r0.attachments?.map(a => a.name) || []
      })
    })
  })
}

rpt.suites.forEach(s => walk(s))

const out = JSON.stringify({ generated: new Date(), summary: rows }, null, 2)
fs.writeFileSync('playwright-report-index.json.gz', zlib.gzipSync(out))
console.log(`✓ index built with ${rows.length} rows`)
