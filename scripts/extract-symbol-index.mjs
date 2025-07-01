#!/usr/bin/env node

import { parse } from 'comment-parser'
import { promises as fs } from 'fs'
import { globby } from 'globby'

/**
 * Normalize description text from jsdoc block
 */
function extractDescription (block) {
  const lines = block.description?.trim().split('\n') ?? []
  return lines.map(line => line.trim()).join(' ')
}

/**
 * Infer kind from tags
 */
function detectKind (tags) {
  const tag = tags.find(t => ['function', 'class', 'const'].includes(t.tag))
  return tag?.tag || null
}

/**
 * Extract symbol name from tags
 */
function detectName (tags) {
  const tag = tags.find(t => ['function', 'class', 'const'].includes(t.tag))
  return tag?.name || null
}

/**
 * Convert tags to param objects
 */
function extractParams (tags) {
  return tags
    .filter(t => t.tag === 'param')
    .map(p => ({
      name: p.name,
      type: p.type || '',
      desc: (p.description || '').trim()
    }))
}

/**
 * Extract return type if available
 */
function extractReturns (tags) {
  const ret = tags.find(t => t.tag === 'returns' || t.tag === 'return')
  return ret?.type || ''
}

async function extractSymbols () {
  const files = await globby(['src/**/*.js', 'src/**/*.mjs'])

  const symbols = []

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    const blocks = parse(content)

    for (const block of blocks) {
      const name = detectName(block.tags)
      const kind = detectKind(block.tags)

      if (!name || !kind) continue

      symbols.push({
        name,
        kind,
        file,
        description: extractDescription(block),
        params: extractParams(block.tags),
        returns: extractReturns(block.tags)
      })
    }
  }

  // Deduplicate by name+file+kind
  const seen = new Set()
  const deduped = symbols.filter(sym => {
    const key = `${sym.name}|${sym.file}|${sym.kind}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort symbols for stable output and reduced git diffs
  deduped.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name)
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.file.localeCompare(b.file)
  })

  await fs.writeFile('symbols.json', JSON.stringify(deduped, null, 2), 'utf8')
  console.log(`✅ symbols.json generated with ${deduped.length} entries.`)
}

extractSymbols().catch(err => {
  console.error(err)
  process.exit(1)
})
