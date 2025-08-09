import { test, expect } from './fixtures'
import { gzipJsonToBase64url } from '../src/utils/compression.js'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { bootWithDashboardState } from './shared/bootState.js'

async function encode (obj) {
  return gzipJsonToBase64url(obj)
}

test('removes ?import & ?import_name from URL after silent import', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)

  await bootWithDashboardState(
    page,
    { globalSettings: { theme: 'dark' }, boards: [] },
    [{ name: 'Old', url: 'http://localhost/old' }],
    { board: '', view: '' },
    `/?import=true&import_name=ci#cfg=${cfg}&svc=${svc}`
  )

  await page.waitForFunction(() => document.body?.dataset?.ready === 'true')

  const url = page.url()
  expect(url).not.toContain('import=')
  expect(url).not.toContain('import_name=')
  expect(url).not.toContain('#cfg=')
  expect(url).not.toContain('#svc=')
})
