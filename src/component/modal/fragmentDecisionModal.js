// @ts-check
/**
 * Modal prompting user to merge or overwrite when config fragment is detected.
 *
 * @module fragmentDecisionModal
 */
import { openModal } from './modalFactory.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'
import { gunzipBase64urlToJson } from '../../utils/compression.js'
import { mergeBoards, mergeServices } from '../../utils/merge.js'
import { Logger } from '../../utils/Logger.js'

/** @typedef {import('../../types.js').DashboardConfig} DashboardConfig */
/** @typedef {import('../../types.js').Service} Service */
/** @typedef {import('../../types.js').Board} Board */

const logger = new Logger('fragmentDecisionModal.js')

/**
 * Display modal asking user to overwrite or merge fragment data.
 *
 * @param {string|null} cfgParam - Encoded config fragment.
 * @param {string|null} svcParam - Encoded service fragment.
 * @function openFragmentDecisionModal
 * @returns {Promise<void>}
 */
export function openFragmentDecisionModal (cfgParam, svcParam) {
  return new Promise(resolve => {
    openModal({
      id: 'fragment-decision-modal',
      showCloseIcon: false,
      onCloseCallback: () => {
        clearConfigFragment()
        logger.log('Fragment decision modal closed')
        resolve()
      },
      buildContent: (modal, closeModal) => {
        const msg1 = document.createElement('p')
        msg1.textContent = 'A dashboard configuration was detected in the URL.'
        const msg2 = document.createElement('p')
        msg2.textContent = 'What would you like to do?'

        const overwriteBtn = document.createElement('button')
        overwriteBtn.textContent = '⬇ Overwrite existing data'
        overwriteBtn.classList.add('modal__btn', 'modal__btn--danger')
        overwriteBtn.addEventListener('click', async () => {
          await applyFragment(true)
        })

        const mergeBtn = document.createElement('button')
        mergeBtn.textContent = '➕ Merge into current setup'
        mergeBtn.classList.add('modal__btn', 'modal__btn--save')
        mergeBtn.addEventListener('click', async () => {
          await applyFragment(false)
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = '✖ Cancel'
        cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
        cancelBtn.addEventListener('click', closeModal)

        const btnGroup = document.createElement('div')
        btnGroup.classList.add('modal__btn-group')
        btnGroup.append(overwriteBtn, mergeBtn, cancelBtn)

        modal.append(msg1, msg2, btnGroup)

        /**
         * Applies the configuration from the URL fragment, either by overwriting or merging.
         * @function applyFragment
         * @param {boolean} overwrite - If true, existing data will be replaced.
         * @returns {Promise<void>}
         */
        async function applyFragment (overwrite) {
          try {
            if (cfgParam) {
              const cfg = /** @type {DashboardConfig} */(await gunzipBase64urlToJson(cfgParam))
              if (overwrite) {
                localStorage.setItem('config', JSON.stringify(cfg))
                if (Array.isArray(cfg.boards)) {
                  localStorage.setItem('boards', JSON.stringify(cfg.boards))
                } else {
                  localStorage.removeItem('boards')
                }
              } else {
                const existingCfgStr = localStorage.getItem('config')
                const existingBoardsStr = localStorage.getItem('boards')
                /** @type {DashboardConfig} */
                const currentCfg = existingCfgStr ? JSON.parse(existingCfgStr) : {}
                const currentBoards = existingBoardsStr ? JSON.parse(existingBoardsStr) : []
                const mergedBoards = mergeBoards(currentBoards, cfg.boards || [])
                currentCfg.boards = mergedBoards
                currentCfg.globalSettings = currentCfg.globalSettings || cfg.globalSettings
                localStorage.setItem('config', JSON.stringify(currentCfg))
                localStorage.setItem('boards', JSON.stringify(mergedBoards))
              }
            }

            if (svcParam) {
              const svc = /** @type {Array<Service>} */(await gunzipBase64urlToJson(svcParam))
              if (overwrite) {
                localStorage.setItem('services', JSON.stringify(svc))
              } else {
                const existingStr = localStorage.getItem('services')
                const existing = existingStr ? JSON.parse(existingStr) : []
                const merged = mergeServices(existing, svc)
                localStorage.setItem('services', JSON.stringify(merged))
              }
            }
          } catch (e) {
            logger.error('Error applying fragment:', e)
          } finally {
            closeModal()
            setTimeout(() => location.reload(), 200)
          }
        }
      }
    })
  })
}
