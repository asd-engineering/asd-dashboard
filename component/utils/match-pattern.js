// @ts-check
/**
 * Resolve dotted/array paths against pattern maps.
 *
 * @module match-pattern
 */

/**
 * Find the most specific match for a path in a pattern object.
 *
 * Patterns may include `[]` to match any array index.
 *
 * @param {string} path
 * @param {Record<string, any>} patterns
 * @returns {{kind:'template'|'placeholder', value:any}|undefined}
 */
export function matchPattern (path, patterns) {
  if (!patterns) return undefined
  let best
  for (const [pattern, value] of Object.entries(patterns)) {
    const regex = new RegExp('^' + pattern.replace(/\[\]/g, '\\[\\d+\\]').replace(/\./g, '\\.') + '$')
    if (regex.test(path)) {
      if (!best || pattern.length > best.pattern.length) {
        best = { pattern, value }
      }
    }
  }
  if (!best) return undefined
  const val = best.value
  const kind = typeof val === 'string' ? 'placeholder' : 'template'
  return { kind, value: typeof val === 'object' ? structuredClone(val) : val }
}
