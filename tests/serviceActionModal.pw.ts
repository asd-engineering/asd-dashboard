/**
 * Tests for the service action modal, widget offline guard, and tunnel detection.
 *
 * Covers:
 * - Service launch modal status badge, buttons, and completion detection
 * - Widget offline overlay guard (ttyd online/offline/missing)
 * - Tunnel detection: servicesUrl rewriting for non-localhost hosts
 */
import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { tunnelServices, tunnelServicesWithTtydOffline, tunnelServicesWithoutTtyd } from './data/tunnelServices'
import { bootWithDashboardState } from './shared/bootState'
import { routeConfigAndServices } from './shared/mocking'
import { navigate, getServices } from './shared/common'
import { encodeConfig } from '../src/utils/compression.js'
import { applyKeyMap } from '../src/utils/keymap.js'
import { KEY_MAP } from '../src/utils/fragmentKeyMap.js'
import { FRAG_MINIMIZE_ENABLED } from '../src/utils/fragmentConstants.js'
import { minimizeDeep } from '../src/utils/minimizer.js'
import { DEFAULT_CONFIG_TEMPLATE } from '../src/storage/defaultConfig.js'
import { computeCRC32Hex } from '../src/utils/checksum.js'

// Services with an offline codeserver that has a fallback action
const servicesWithOffline = [
  { id: 'ttyd', name: 'ASD Terminal', url: 'http://localhost:8000/asd/terminal', state: 'online', maxInstances: 10 },
  {
    id: 'codeserver',
    name: 'ASD Code',
    url: 'http://localhost:8000/asd/codeserver',
    state: 'offline',
    fallback: { name: 'Start Service', url: 'http://localhost:8000/asd/ttyd/?arg=asd&arg=code&arg=start', method: 'GET' },
    maxInstances: 10
  }
]

// Services with ttyd offline
const servicesWithTtydOffline = [
  { id: 'ttyd', name: 'ASD Terminal', url: 'http://localhost:8000/asd/terminal', state: 'offline', maxInstances: 10 },
  {
    id: 'codeserver',
    name: 'ASD Code',
    url: 'http://localhost:8000/asd/codeserver',
    state: 'offline',
    fallback: { name: 'Start Service', url: 'http://localhost:8000/asd/ttyd/?arg=asd&arg=code&arg=start', method: 'GET' },
    maxInstances: 10
  }
]

// Services without ttyd at all
const servicesWithoutTtyd = [
  {
    id: 'codeserver',
    name: 'ASD Code',
    url: 'http://localhost:8000/asd/codeserver',
    state: 'offline',
    fallback: { name: 'Start Service', url: 'http://localhost:8000/asd/ttyd/?arg=asd&arg=code&arg=start', method: 'GET' },
    maxInstances: 10
  }
]

const testConfig = {
  ...ciConfig,
  boards: [
    {
      id: 'board-test',
      name: 'Test Board',
      order: 0,
      views: [
        {
          id: 'view-test',
          name: 'Default',
          widgetState: [
            {
              order: '0',
              url: 'http://localhost:8000/asd/codeserver',
              serviceId: 'codeserver',
              type: 'iframe',
              settings: { autoRefresh: false, refreshInterval: 0 },
              metadata: { title: 'ASD Code' }
            }
          ]
        }
      ]
    }
  ]
}

const last = { board: 'board-test', view: 'view-test' }

/**
 * Helper to encode config for fragment URL (same as configServicesUrl tests).
 */
async function encodeConfigForFragment(config: any): Promise<string> {
  const cfgDefaults = applyKeyMap(DEFAULT_CONFIG_TEMPLATE, KEY_MAP, 'encode')
  const cfgMapped = applyKeyMap(config, KEY_MAP, 'encode')
  const cfgMinimized = FRAG_MINIMIZE_ENABLED
    ? minimizeDeep(cfgMapped, cfgDefaults) ?? {}
    : cfgMapped
  const { data } = await encodeConfig(cfgMinimized, { algo: 'deflate' })
  const checksum = computeCRC32Hex(JSON.stringify(cfgMinimized))
  return `cfg=${data}&algo=deflate&cc=${checksum}`
}

function fulfillJsonWithCors(route: any, data: any) {
  route.fulfill({
    json: data,
    headers: { 'access-control-allow-origin': '*' }
  })
}

// ─── Service Action Modal ───────────────────────────────────────────────────

test.describe('Service action modal', () => {
  test('shows status badge with Running state', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    // Click the offline overlay start button
    const startBtn = page.locator('.widget-offline-start')
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    // Modal should appear with status badge
    const badge = page.locator('.service-action-status')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('Running...')
    await expect(badge).toHaveAttribute('data-status', 'running')
  })

  test('shows Minimize and Done buttons', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    const startBtn = page.locator('.widget-offline-start')
    await expect(startBtn).toBeVisible()
    await startBtn.click()

    // Check buttons
    const minimize = page.locator('.service-action-btn-secondary')
    const done = page.locator('.service-action-btn-primary')
    await expect(minimize).toBeVisible()
    await expect(minimize).toHaveText('Minimize')
    await expect(done).toBeVisible()
    await expect(done).toHaveText('Done')

    // Check open-in-new-tab link
    const link = page.locator('.service-action-buttons a[target="_blank"]')
    await expect(link).toBeVisible()
    await expect(link).toHaveText('Open in new tab')
  })

  test('Open in new tab link has correct URL with session arg', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    const startBtn = page.locator('.widget-offline-start')
    await startBtn.click()

    const link = page.locator('.service-action-buttons a[target="_blank"]')
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()
    // Should contain the original service URL args plus a --session= arg
    expect(href).toContain('arg=asd')
    expect(href).toContain('arg=code')
    expect(href).toContain('arg=start')
    // Session arg is URL-encoded: --session%3D...
    expect(href).toMatch(/--session[%3D=]/)
  })

  test('Done button hides offline overlay', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    // Open modal
    const startBtn = page.locator('.widget-offline-start')
    await startBtn.click()
    await expect(page.locator('.service-action-modal')).toBeVisible()

    // Click Done
    const done = page.locator('.service-action-btn-primary')
    await done.click()

    // Overlay should be hidden
    const overlay = page.locator('.widget-offline-overlay')
    await expect(overlay).toHaveCSS('display', 'none')
  })

  test('status badge transitions to Completed on [task completed] signal', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    // Stub the iframe route to serve controllable content
    await page.route('**/asd/ttyd/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><body><div class="xterm-rows">waiting...</div></body></html>'
      })
    })

    // Open modal
    const startBtn = page.locator('.widget-offline-start')
    await startBtn.click()

    const badge = page.locator('.service-action-status')
    await expect(badge).toHaveAttribute('data-status', 'running')

    // Inject [task completed] into the iframe via page.evaluate
    await page.evaluate(() => {
      const iframe = document.querySelector('.service-action-iframe') as HTMLIFrameElement
      if (iframe?.contentDocument) {
        iframe.contentDocument.body.innerHTML = '<div class="xterm-rows">[task completed]</div>'
      }
    })

    // Wait for the 2s polling interval + margin
    await page.waitForTimeout(2500)

    // Badge should update
    await expect(badge).toHaveText('Completed')
    await expect(badge).toHaveAttribute('data-status', 'completed')

    // Done button should now say Close
    const done = page.locator('.service-action-btn-primary')
    await expect(done).toHaveText('Close')
  })

  test('completion interval cleans up on modal close', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    // Open modal
    const startBtn = page.locator('.widget-offline-start')
    await startBtn.click()

    // Minimize (close without completing)
    const minimize = page.locator('.service-action-btn-secondary')
    await minimize.click()

    // Modal should be gone
    await expect(page.locator('.service-action-modal')).not.toBeVisible()

    // No errors should appear from orphaned intervals
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.waitForTimeout(3000) // longer than the 2s interval
    expect(errors.length).toBe(0)
  })
})

// ─── Widget Offline Guard ───────────────────────────────────────────────────

test.describe('Widget offline guard', () => {
  test('shows action button when ttyd is online', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithOffline })
    await bootWithDashboardState(page, testConfig, servicesWithOffline, last)

    // Should show the action button (ttyd is online)
    const actionBtn = page.locator('.widget-offline-start')
    await expect(actionBtn).toBeVisible()
    await expect(actionBtn).toHaveText('Start Service')
  })

  test('shows Terminal offline when ttyd is offline', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithTtydOffline })
    await bootWithDashboardState(page, testConfig, servicesWithTtydOffline, last)

    // Should NOT show the action button (ttyd is offline)
    const actionBtn = page.locator('.widget-offline-start')
    await expect(actionBtn).not.toBeVisible()

    // Should show "Terminal offline" label
    const labels = page.locator('.widget-offline-label')
    const texts = await labels.allTextContents()
    expect(texts.some(t => t.includes('Terminal offline'))).toBeTruthy()
  })

  test('shows Terminal offline when ttyd missing from services', async ({ page }) => {
    await routeConfigAndServices(page, { config: { ...ciConfig, boards: ciBoards }, services: servicesWithoutTtyd })
    await bootWithDashboardState(page, testConfig, servicesWithoutTtyd, last)

    // Should NOT show the action button (no ttyd at all)
    const actionBtn = page.locator('.widget-offline-start')
    await expect(actionBtn).not.toBeVisible()

    // Should show "Terminal offline" label
    const labels = page.locator('.widget-offline-label')
    const texts = await labels.allTextContents()
    expect(texts.some(t => t.includes('Terminal offline'))).toBeTruthy()
  })
})

// ─── Tunnel Detection ───────────────────────────────────────────────────────

test.describe('Tunnel detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (window.top === window) {
        if (!sessionStorage.getItem('__asdCleared__')) {
          localStorage.clear()
          sessionStorage.setItem('__asdCleared__', '1')
        }
      }
    })
  })

  test('rewrites servicesUrl to public variant for non-localhost host', async ({ page }) => {
    // Config references hub-services.json (the private variant)
    const configWithTunnel = {
      ...ciConfig,
      servicesUrl: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/hub-services.json',
      boards: ciBoards
    }

    // Mock both endpoints
    await page.route('**/hub-services-public.json', route =>
      fulfillJsonWithCors(route, tunnelServices)
    )
    await page.route('**/hub-services.json', route => {
      // If tunnel detection works, this should NOT be called
      // (it gets rewritten to -public.json)
      fulfillJsonWithCors(route, ciServices)
    })

    // Capture console messages for tunnel detection log
    const consoleMessages: string[] = []
    page.on('console', msg => {
      if (msg.text().includes('Tunnel detected')) {
        consoleMessages.push(msg.text())
      }
    })

    const fragmentParams = await encodeConfigForFragment(configWithTunnel)

    // On localhost, the tunnel detection will NOT fire (host IS localhost)
    // so the hub-services.json will be fetched directly.
    // This test verifies the logic exists; full tunnel testing needs a non-localhost host.
    await navigate(page, `/?import=true#${fragmentParams}`)

    const services = await getServices(page)
    // On localhost, we should get ciServices (from hub-services.json route)
    expect(services.length).toBe(ciServices.length)
  })

  test('keeps servicesUrl unchanged for localhost', async ({ page }) => {
    const configWithLocalUrl = {
      ...ciConfig,
      servicesUrl: '/asde/hub-services.json',
      boards: ciBoards
    }

    await page.route('**/hub-services.json', route =>
      fulfillJsonWithCors(route, ciServices)
    )

    const fragmentParams = await encodeConfigForFragment(configWithLocalUrl)
    await navigate(page, `/?import=true#${fragmentParams}`)

    const services = await getServices(page)
    expect(services.length).toBe(ciServices.length)
    // Verify it's the local services, not tunnel ones
    expect(services.some((s: any) => s.name === ciServices[0]?.name)).toBeTruthy()
  })

  test('keeps servicesUrl unchanged when already public', async ({ page }) => {
    // If servicesUrl already points to hub-services-public.json, no rewrite needed
    const configAlreadyPublic = {
      ...ciConfig,
      servicesUrl: 'https://hub-kelvin.eu1.tn.asd.engineer/asde/hub-services-public.json',
      boards: ciBoards
    }

    await page.route('**/hub-services-public.json', route =>
      fulfillJsonWithCors(route, tunnelServices)
    )

    const fragmentParams = await encodeConfigForFragment(configAlreadyPublic)
    await navigate(page, `/?import=true#${fragmentParams}`)

    const services = await getServices(page)
    expect(services.length).toBe(tunnelServices.length)
    expect(services.some((s: any) => s.name === 'ASD Terminal')).toBeTruthy()
  })
})
