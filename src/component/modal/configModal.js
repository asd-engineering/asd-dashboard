// @ts-check
/**
 * Modal dialog for editing the application configuration.
 *
 * @module configModal
 */
import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

export const DEFAULT_CONFIG_TEMPLATE = {
  globalSettings: {
    theme: 'light',
    widgetStoreUrl: [],
    database: 'localStorage',
    localStorage: {
      enabled: 'true',
      loadDashboardFromConfig: 'true'
    }
  },
  boards: [],
  styling: {
    widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
  }
}

const logger = new Logger('configModal.js')

/**
 * Gzip en base64url encode een string.
 * @param {string} data
 * @returns {Promise<string>}
 */
async function gzipBase64Url (data) {
  const cs = new CompressionStream('gzip')
  const stream = new Blob([data]).stream().pipeThrough(cs)
  const buffer = await new Response(stream).arrayBuffer()
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Open a modal dialog allowing the user to edit and save configuration JSON.
 *
 * @function openConfigModal
 * @returns {void}
 */
export function openConfigModal () {
  const storedConfig = localStorage.getItem('config')
  const storedBoards = localStorage.getItem('boards')
  const configData = storedConfig ? JSON.parse(storedConfig) : { ...DEFAULT_CONFIG_TEMPLATE }

  if (storedBoards) {
    try {
      const boards = JSON.parse(storedBoards)
      if (Array.isArray(boards)) {
        configData.boards = boards
      }
    } catch (e) {
      logger.error('Failed to parse boards from localStorage:', e)
    }
  }

  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: (modal, closeModal) => {
      const textarea = document.createElement('textarea')
      textarea.id = 'config-json'
      textarea.classList.add('modal__textarea--grow')
      textarea.value = JSON.stringify(configData, null, 2)
      modal.appendChild(textarea)

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')
      saveButton.addEventListener('click', () => {
        try {
          const cfg = JSON.parse(textarea.value)
          localStorage.setItem('config', JSON.stringify(cfg))

          if (Array.isArray(cfg.boards)) {
            localStorage.setItem('boards', JSON.stringify(cfg.boards))
          } else {
            localStorage.removeItem('boards')
          }

          showNotification('Config saved to localStorage')
          closeModal()
          setTimeout(() => location.reload(), 500)
        } catch (e) {
          logger.error('Invalid JSON:', e)
          showNotification('Invalid JSON format', 3000, 'error')
        }
      })

      const exportButton = document.createElement('button')
      exportButton.textContent = 'Export'
      exportButton.title = 'Genereer deelbare URL'
      exportButton.classList.add('modal__btn', 'modal__btn--export')
      exportButton.addEventListener('click', async () => {
        try {
          const cfgRaw = localStorage.getItem('config')
          const svcRaw = localStorage.getItem('services')

          let cfgValid = true
          let svcValid = true
          try { if (!cfgRaw) cfgValid = false; else JSON.parse(cfgRaw) } catch { cfgValid = false }
          try { if (!svcRaw) svcValid = false; else JSON.parse(svcRaw) } catch { svcValid = false }

          if (!cfgValid || !svcValid) {
            logger.warn('Export aborted: missing config or services')
            showNotification('❌ Cannot export: config or services are missing', 4000, 'error')
            return
          }

          const [cfgEnc, svcEnc] = await Promise.all([
            gzipBase64Url(cfgRaw),
            gzipBase64Url(svcRaw)
          ])
          const url = `${location.origin}${location.pathname}#cfg=${cfgEnc}&svc=${svcEnc}`

          await navigator.clipboard.writeText(url)

          if (url.length > 60000) {
            showNotification('⚠️ URL is very large and may not work in all browsers', 6000, 'error')
            logger.warn(`Exported URL length: ${url.length}`)
          } else {
            const kb = (url.length / 1024).toFixed(1)
            showNotification(`✅ URL copied to clipboard! (${kb} KB)`, 4000, 'success')
          }

          logger.info(`Exported config URL (${url.length} chars)`)
        } catch (e) {
          showNotification('❌ Failed to export config', 4000, 'error')
          logger.error('Export failed', e)
        }
      })

      const closeButton = document.createElement('button')
      closeButton.textContent = 'Close'
      closeButton.classList.add('modal__btn', 'modal__btn--cancel')
      closeButton.addEventListener('click', closeModal)

      const buttonContainer = document.createElement('div')
      buttonContainer.classList.add('modal__btn-group')
      buttonContainer.append(saveButton, exportButton, closeButton)
      modal.appendChild(buttonContainer)
    }
  })
}
