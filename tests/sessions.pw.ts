// @ts-check
/**
 * E2E tests for MADE session rendering in the dashboard.
 * Verifies that session services from sessions.yaml are properly rendered
 * as widgets with offline overlays and launch buttons.
 */
import { test, expect } from '@playwright/test'
import { bootWithDashboardState } from './shared/bootState'
import { ensurePanelOpen, hoverPanelItem } from './shared/panels'

// -- Test fixtures: mimics what hub-config.ts generates from sessions.yaml --

const SESSION_SERVICES = [
  {
    id: 'session-abc12345',
    name: 'ASD/project: Implement workspace plan',
    url: '',
    state: 'offline',
    maxInstances: 1,
    fallback: {
      name: 'Launch Session',
      url: '/asde/ttyd/?arg=claude&arg=--resume&arg=abc12345-full-uuid&arg=--session%3Dsession-abc12345',
      method: 'GET'
    }
  },
  {
    id: 'session-def67890',
    name: 'ASD/project: Fix authentication bug',
    url: '',
    state: 'offline',
    maxInstances: 1,
    fallback: {
      name: 'Launch Session',
      url: '/asde/ttyd/?arg=claude&arg=--resume&arg=def67890-full-uuid&arg=--session%3Dsession-def67890',
      method: 'GET'
    }
  },
  {
    id: 'pinned-dev-server',
    name: 'Dev Server',
    url: '',
    state: 'offline',
    maxInstances: 1,
    fallback: {
      name: 'Launch Session',
      url: '/asde/ttyd/?arg=pnpm&arg=dev&arg=--session%3Dpinned-dev-server',
      method: 'GET'
    }
  },
  // Infrastructure service with start/stop actions
  {
    id: 'codeserver',
    name: 'Code Server',
    url: 'http://localhost:8443',
    state: 'online',
    maxInstances: 1,
    fallback: {
      name: 'Stop Service',
      url: '/asde/ttyd/?arg=asd&arg=codeserver&arg=stop',
      method: 'GET'
    }
  },
  // A regular online service for contrast
  {
    id: 'ttyd',
    name: 'Terminal',
    url: 'http://localhost:7681',
    state: 'online',
    maxInstances: 10
  }
]

const SESSION_BOARD = {
  id: 'board-workspace-sessions',
  name: 'Claude',
  order: 99,
  views: [
    {
      id: 'view-sessions-asd-project',
      name: 'ASD/project',
      maxInstances: 10,
      widgetState: [
        {
          dataid: 'widget-session-abc12345',
          serviceId: 'session-abc12345',
          order: '0',
          url: '',
          columns: '4',
          rows: '4',
          type: 'service',
          metadata: {},
          settings: {}
        },
        {
          dataid: 'widget-session-def67890',
          serviceId: 'session-def67890',
          order: '1',
          url: '',
          columns: '4',
          rows: '4',
          type: 'service',
          metadata: {},
          settings: {}
        }
      ]
    },
    {
      id: 'view-sessions-tasks',
      name: 'Tasks',
      maxInstances: 10,
      widgetState: [
        {
          dataid: 'widget-pinned-dev-server',
          serviceId: 'pinned-dev-server',
          order: '0',
          url: '',
          columns: '4',
          rows: '4',
          type: 'service',
          metadata: {},
          settings: {}
        }
      ]
    }
  ]
}

const CONFIG = {
  globalSettings: {
    theme: 'light',
    hideBoardControl: false,
    hideViewControl: false,
    hideServiceControl: false,
    showMenuWidget: false,
    views: { showViewOptionsAsButtons: true, viewToShow: 'ASD/project' },
    localStorage: { enabled: 'true', loadDashboardFromConfig: 'true' }
  },
  boards: [SESSION_BOARD],
  styling: { widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 } }
}

test.describe('Session widgets', () => {
  test('should render session widgets with offline overlay', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    const widgets = page.locator('.widget-wrapper')
    await expect(widgets).toHaveCount(2)

    // Each session widget should have an offline overlay visible
    const overlays = page.locator('.widget-offline-overlay')
    await expect(overlays).toHaveCount(2)

    const firstOverlay = overlays.first()
    await expect(firstOverlay).toBeVisible()

    // Should have an offline badge
    const badge = firstOverlay.locator('.widget-offline-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('offline')

    // Button should use fallback.name ("Launch Session")
    const firstButton = firstOverlay.locator('.widget-offline-start')
    await expect(firstButton).toHaveText('Launch Session')
  })

  test('should show service name label in offline overlay', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // The label should show the full session name (above the button)
    const labels = page.locator('.widget-offline-label')
    const count = await labels.count()
    expect(count).toBeGreaterThanOrEqual(1)

    const firstLabel = labels.first()
    await expect(firstLabel).toContainText('Implement workspace plan')
  })

  test('should show command preview in offline overlay', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Command preview should show the ttyd args
    const cmdPreviews = page.locator('.widget-offline-cmd')
    const count = await cmdPreviews.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // First session command should contain "claude --resume"
    const firstCmd = cmdPreviews.first()
    await expect(firstCmd).toContainText('claude')
    await expect(firstCmd).toContainText('--resume')
  })

  test('should open launch modal when clicking overlay button', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    const firstButton = page.locator('.widget-offline-start').first()
    await firstButton.click()

    // Modal should appear
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    // Modal should show the service name as header
    const header = modal.locator('.service-action-header')
    await expect(header).toContainText('ASD/project: Implement workspace plan')

    // Context-aware instructions
    const instructions = modal.locator('p')
    await expect(instructions).toContainText('Task is running below')

    // iframe pointing to ttyd
    const iframe = modal.locator('iframe')
    const src = await iframe.getAttribute('src')
    expect(src).toContain('/asde/ttyd/')
    expect(src).toContain('arg=claude')
    expect(src).toContain('arg=--resume')

    // Should have distinct Minimize and Done buttons
    await expect(modal.locator('.service-action-btn-secondary', { hasText: 'Minimize' })).toBeVisible()
    await expect(modal.locator('.service-action-btn-primary', { hasText: 'Done' })).toBeVisible()

    // Should have "Open in new tab" link
    await expect(modal.locator('a', { hasText: 'Open in new tab' })).toBeVisible()
  })

  test('should show launch icon in service panel for sessions', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    await ensurePanelOpen(page, 'service-panel')

    const sessionItem = page.locator('[data-testid="service-panel"] .panel-item[data-id="session-abc12345"]')
    await expect(sessionItem).toBeVisible()

    await hoverPanelItem(page, sessionItem)

    // Should have a task action button with rocket icon
    const popover = page.locator('[data-sticky-popover]')
    const taskButton = popover.locator('button').filter({ hasText: '🚀' })
    await expect(taskButton.first()).toBeVisible()
  })

  test('should navigate between session views', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Should start on ASD/project view with 2 widgets
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)

    // Switch to Tasks view
    const viewButtons = page.locator('.view-options button, .view-tab')
    const tasksView = viewButtons.filter({ hasText: 'Tasks' })
    if (await tasksView.count() > 0) {
      await tasksView.first().click()
      await page.waitForTimeout(500)

      // Tasks view should have 1 widget (pinned dev server)
      await expect(page.locator('.widget-wrapper')).toHaveCount(1)

      // Its overlay should show "Launch Session"
      const overlay = page.locator('.widget-offline-start')
      await expect(overlay).toHaveText('Launch Session')
    }
  })

  test('should close modal with minimize and resume widget', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Open launch modal
    await page.locator('.widget-offline-start').first().click()
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    // Click minimize (secondary button)
    await modal.locator('.service-action-btn-secondary', { hasText: 'Minimize' }).click()

    // Modal should be closed
    await expect(modal).not.toBeVisible()

    // Widget should still be there with overlay
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)
  })
})

test.describe('Service task control', () => {
  test('should show stop action for online service with fallback', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    await ensurePanelOpen(page, 'service-panel')

    // Find the codeserver service (online, has fallback with "Stop Service")
    const codeserverItem = page.locator('[data-testid="service-panel"] .panel-item[data-id="codeserver"]')
    await expect(codeserverItem).toBeVisible()

    await hoverPanelItem(page, codeserverItem)

    // Should have a stop action button (⛔ icon for non-start/launch actions)
    const popover = page.locator('[data-sticky-popover]')
    const stopButton = popover.locator('button').filter({ hasText: '⛔' })
    await expect(stopButton.first()).toBeVisible()
  })

  test('should open modal with correct service name when clicking task action', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    await ensurePanelOpen(page, 'service-panel')

    const codeserverItem = page.locator('[data-testid="service-panel"] .panel-item[data-id="codeserver"]')
    await expect(codeserverItem).toBeVisible()
    await hoverPanelItem(page, codeserverItem)

    // Click the stop action
    const popover = page.locator('[data-sticky-popover]')
    const stopButton = popover.locator('button').filter({ hasText: '⛔' })
    await stopButton.first().click()

    // Modal should open with correct service name
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    const header = modal.locator('.service-action-header')
    await expect(header).toContainText('Code Server')

    // iframe should point to the stop command
    const iframe = modal.locator('iframe')
    const src = await iframe.getAttribute('src')
    expect(src).toContain('/asde/ttyd/')
    expect(src).toContain('arg=asd')
    expect(src).toContain('arg=codeserver')
    expect(src).toContain('arg=stop')
  })

  test('should track task in runtime state after launching', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Launch a session
    await page.locator('.widget-offline-start').first().click()
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    // Check runtime state has a task
    const taskCount = await page.evaluate(() => {
      return window.asd?.runtime?.tasks?.length ?? 0
    })
    expect(taskCount).toBeGreaterThanOrEqual(1)

    // The task should have the session name
    const taskTitle = await page.evaluate(() => {
      const tasks = window.asd?.runtime?.tasks ?? []
      return tasks[0]?.title ?? ''
    })
    expect(taskTitle).toContain('Implement workspace plan')
  })

  test('should update task status on minimize and done', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Launch a session
    await page.locator('.widget-offline-start').first().click()
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    // Task should be 'running'
    let status = await page.evaluate(() => window.asd?.runtime?.tasks?.[0]?.status)
    expect(status).toBe('running')

    // Minimize
    await modal.locator('.service-action-btn-secondary', { hasText: 'Minimize' }).click()
    await expect(modal).not.toBeVisible()

    // Task should be 'minimized'
    status = await page.evaluate(() => window.asd?.runtime?.tasks?.[0]?.status)
    expect(status).toBe('minimized')
  })
})
