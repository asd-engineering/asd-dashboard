import { test, expect } from '@playwright/test'
import { encodeConfig, decodeConfig } from '../src/utils/compression.js'
import { splitIntoParams, joinFromParams, formatChunksManifest } from '../src/utils/chunker.js'
import { minimizeDeep, restoreDeep } from '../src/utils/minimizer.js'
import { computeCRC32Hex } from '../src/utils/checksum.js'
import { applyKeyMap } from '../src/utils/keymap.js'

const KEY_MAP = { foo: 'f', bar: 'b', name: 'n', url: 'u' }
const CFG_DEFAULTS = { foo: 1, bar: 0, arr: [] }
const CFG_SAMPLE = { foo: 1, bar: 2, arr: [] }
const SVC_SAMPLE = [{ name: 'svc', url: 'http://x' }]

async function roundTrip (algo: 'gzip'|'deflate', maxLen: number) {
  const cfgMapped = applyKeyMap(CFG_SAMPLE, KEY_MAP, 'encode')
  const svcMapped = applyKeyMap(SVC_SAMPLE, KEY_MAP, 'encode')
  const cfgDefMapped = applyKeyMap(CFG_DEFAULTS, KEY_MAP, 'encode')
  const svcDefMapped: any = []

  const cfgMin = minimizeDeep(cfgMapped, cfgDefMapped, { dropEmpties: true }) ?? {}
  const svcMin = minimizeDeep(svcMapped, svcDefMapped, { dropEmpties: true }) ?? []

  const [cfgRes, svcRes] = await Promise.all([
    encodeConfig(cfgMin, { algo, withChecksum: true }),
    encodeConfig(svcMin, { algo, withChecksum: true })
  ])
  const ccw = computeCRC32Hex(JSON.stringify({ c: cfgMin, s: svcMin }))

  const params = new URLSearchParams()
  params.set('algo', algo)
  params.set('cc', `${cfgRes.checksum},${svcRes.checksum}`)
  params.set('ccw', ccw)
  const cfgPairs = splitIntoParams('cfg', cfgRes.data, maxLen)
  const svcPairs = splitIntoParams('svc', svcRes.data, maxLen)
  for (const [k, v] of [...cfgPairs, ...svcPairs]) params.set(k, v)
  const manifest = formatChunksManifest({
    cfg: cfgPairs.length > 1 ? cfgPairs.length : 0,
    svc: svcPairs.length > 1 ? svcPairs.length : 0
  })
  if (manifest) params.set('chunks', manifest)

  const cfgJoined = joinFromParams('cfg', params)!
  const svcJoined = joinFromParams('svc', params)!
  const cfgDec = await decodeConfig(cfgJoined, { algo, expectChecksum: cfgRes.checksum })
  const svcDec = await decodeConfig(svcJoined, { algo, expectChecksum: svcRes.checksum })
  const calc = computeCRC32Hex(JSON.stringify({ c: cfgDec, s: svcDec }))
  expect(calc).toBe(ccw)
  const cfgRestored = restoreDeep(cfgDec, cfgDefMapped)
  const svcRestored = restoreDeep(svcDec, svcDefMapped)
  const cfgOut = applyKeyMap(cfgRestored, KEY_MAP, 'decode')
  const svcOut = applyKeyMap(svcRestored, KEY_MAP, 'decode')
  expect(cfgOut).toEqual(CFG_SAMPLE)
  expect(svcOut).toEqual(SVC_SAMPLE)
}

test('single export round-trip (deflate + gzip)', async () => {
  await roundTrip('deflate', 1000)
  await roundTrip('gzip', 1000)
})

test('chunked export round-trip (deflate + gzip)', async () => {
  await roundTrip('deflate', 10)
  await roundTrip('gzip', 10)
})

test('permuted chunk order fails until sorted', async () => {
  const algo: 'deflate' = 'deflate'
  const cfgMapped = applyKeyMap(CFG_SAMPLE, KEY_MAP, 'encode')
  const cfgDefMapped = applyKeyMap(CFG_DEFAULTS, KEY_MAP, 'encode')
  const cfgMin = minimizeDeep(cfgMapped, cfgDefMapped, { dropEmpties: true }) ?? {}
  const { data, checksum } = await encodeConfig(cfgMin, { algo, withChecksum: true })
  const parts = splitIntoParams('cfg', data, 5)
  const rev = parts.slice().reverse()
  const wrong = rev.map(([, v]) => v).join('')
  await expect(decodeConfig(wrong, { algo, expectChecksum: checksum })).rejects.toThrow()
  const params = new URLSearchParams()
  for (const [k, v] of rev) params.set(k, v)
  const joined = joinFromParams('cfg', params)!
  const decoded = await decodeConfig(joined, { algo, expectChecksum: checksum })
  const restored = restoreDeep(decoded, cfgDefMapped)
  const cfgOut = applyKeyMap(restored, KEY_MAP, 'decode')
  expect(cfgOut).toEqual(CFG_SAMPLE)
})

test('legacy single-param links still import', async () => {
  const algo: 'gzip' = 'gzip'
  const cfgMapped = applyKeyMap(CFG_SAMPLE, KEY_MAP, 'encode')
  const svcMapped = applyKeyMap(SVC_SAMPLE, KEY_MAP, 'encode')
  const cfgDefMapped = applyKeyMap(CFG_DEFAULTS, KEY_MAP, 'encode')
  const svcDefMapped: any = []
  const cfgMin = minimizeDeep(cfgMapped, cfgDefMapped, { dropEmpties: true }) ?? {}
  const svcMin = minimizeDeep(svcMapped, svcDefMapped, { dropEmpties: true }) ?? []
  const [cfgRes, svcRes] = await Promise.all([
    encodeConfig(cfgMin, { algo, withChecksum: true }),
    encodeConfig(svcMin, { algo, withChecksum: true })
  ])
  const params = new URLSearchParams()
  params.set('cfg', cfgRes.data)
  params.set('svc', svcRes.data)
  params.set('cc', `${cfgRes.checksum},${svcRes.checksum}`)
  const cfgJoined = joinFromParams('cfg', params)!
  const svcJoined = joinFromParams('svc', params)!
  const cfgDec = await decodeConfig(cfgJoined, { algo, expectChecksum: cfgRes.checksum })
  const svcDec = await decodeConfig(svcJoined, { algo, expectChecksum: svcRes.checksum })
  const cfgRestored = restoreDeep(cfgDec, cfgDefMapped)
  const svcRestored = restoreDeep(svcDec, svcDefMapped)
  const cfgOut = applyKeyMap(cfgRestored, KEY_MAP, 'decode')
  const svcOut = applyKeyMap(svcRestored, KEY_MAP, 'decode')
  expect(cfgOut).toEqual(CFG_SAMPLE)
  expect(svcOut).toEqual(SVC_SAMPLE)
})
