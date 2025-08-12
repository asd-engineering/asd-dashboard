import { test, expect } from '@playwright/test'
import { encodeConfig, decodeConfig, gzipJsonToBase64url } from '../src/utils/compression.js'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'

const KEY_MAP = { name: 'n', url: 'u', services: 's', config: 'c' }

test('gzip round-trip without key map or checksum', async () => {
  const obj = { foo: 'bar', nested: { a: 1 } }
  const { data } = await encodeConfig(obj, { algo: 'gzip' })
  const decoded = await decodeConfig(data, { algo: 'gzip' })
  expect(decoded).toEqual(obj)
})

test('deflate round-trip without key map or checksum', async () => {
  const obj = { foo: 'bar', arr: [1, 2, 3] }
  const { data } = await encodeConfig(obj, { algo: 'deflate' })
  const decoded = await decodeConfig(data, { algo: 'deflate' })
  expect(decoded).toEqual(obj)
})

test('gzip round-trip with key map and checksum', async () => {
  const obj = { name: 'test', url: 'http://example.com' }
  const { data, checksum } = await encodeConfig(obj, { algo: 'gzip', keyMap: KEY_MAP, withChecksum: true })
  const decoded = await decodeConfig(data, { algo: 'gzip', keyMap: KEY_MAP, expectChecksum: checksum })
  expect(decoded).toEqual(obj)
})

test('deflate round-trip with key map and checksum', async () => {
  const obj = { name: 'test', url: 'http://example.com' }
  const { data, checksum } = await encodeConfig(obj, { algo: 'deflate', keyMap: KEY_MAP, withChecksum: true })
  const decoded = await decodeConfig(data, { algo: 'deflate', keyMap: KEY_MAP, expectChecksum: checksum })
  expect(decoded).toEqual(obj)
})

test('deflate with key map produces shorter URL than gzip', async () => {
  const gzipCfg = await gzipJsonToBase64url(ciConfig)
  const gzipSvc = await gzipJsonToBase64url(ciServices)
  const urlGzip = `#cfg=${gzipCfg}&svc=${gzipSvc}`

  const cfgRes = await encodeConfig(ciConfig, { algo: 'deflate', keyMap: KEY_MAP, withChecksum: true })
  const svcRes = await encodeConfig(ciServices, { algo: 'deflate', keyMap: KEY_MAP, withChecksum: true })
  const params = new URLSearchParams()
  params.set('cfg', cfgRes.data)
  params.set('svc', svcRes.data)
  params.set('algo', 'deflate')
  params.set('cc', `${cfgRes.checksum},${svcRes.checksum}`)
  const urlDeflate = `#${params.toString()}`

  expect(urlDeflate.length).toBeLessThan(urlGzip.length)
})

