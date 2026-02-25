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

    // Verify we're on the Claude board
    const widgets = page.locator('.widget-wrapper')
    await expect(widgets).toHaveCount(2)

    // Each session widget should have an offline overlay visible
    const overlays = page.locator('.widget-offline-overlay')
    await expect(overlays).toHaveCount(2)

    // First overlay should be visible (display != none)
    const firstOverlay = overlays.first()
    await expect(firstOverlay).toBeVisible()

    // Button should use fallback.name ("Launch Session") not "Start <service>"
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

    // The label below the button should show the full session name
    const labels = page.locator('.widget-offline-label')
    // Should have labels for the two session widgets
    const count = await labels.count()
    expect(count).toBeGreaterThanOrEqual(1)

    // First label should contain the session name
    const firstLabel = labels.first()
    await expect(firstLabel).toContainText('Implement workspace plan')
  })

  test('should open launch modal when clicking overlay button', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Click the first launch button
    const firstButton = page.locator('.widget-offline-start').first()
    await firstButton.click()

    // Modal should appear with service-action-modal class
    const modal = page.locator('.service-action-modal')
    await expect(modal).toBeVisible()

    // Modal should show the service name as header
    const header = modal.locator('.service-action-header')
    await expect(header).toContainText('ASD/project: Implement workspace plan')

    // Modal should have context-aware instructions
    const instructions = modal.locator('p')
    await expect(instructions).toContainText('Task is running below')

    // Modal should have an iframe pointing to ttyd
    const iframe = modal.locator('iframe')
    const src = await iframe.getAttribute('src')
    expect(src).toContain('/asde/ttyd/')
    expect(src).toContain('arg=claude')
    expect(src).toContain('arg=--resume')

    // Should have minimize and done buttons
    await expect(modal.locator('button', { hasText: 'Minimize' })).toBeVisible()
    await expect(modal.locator('button', { hasText: 'Done' })).toBeVisible()

    // Should have "Open in new tab" link
    await expect(modal.locator('a', { hasText: 'Open task in new tab' })).toBeVisible()
  })

  test('should show launch icon in service panel for sessions', async ({ page }) => {
    await bootWithDashboardState(
      page,
      CONFIG,
      SESSION_SERVICES,
      { board: 'board-workspace-sessions', view: 'view-sessions-asd-project' }
    )

    // Open the service panel using robust helper
    await ensurePanelOpen(page, 'service-panel')

    // Find a session service item in the panel
    const sessionItem = page.locator('[data-testid="service-panel"] .panel-item[data-id="session-abc12345"]')
    await expect(sessionItem).toBeVisible()

    // Hover to trigger sticky popover using robust helper
    await hoverPanelItem(page, sessionItem)

    // Should have a task action button with rocket icon (🚀) since fallback.name="Launch Session"
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

      // Its overlay should show "Launch Session" (pinned)
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

    // Click minimize
    await modal.locator('button', { hasText: 'Minimize' }).click()

    // Modal should be closed
    await expect(modal).not.toBeVisible()

    // Widget should still be there with overlay
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)
  })
})
