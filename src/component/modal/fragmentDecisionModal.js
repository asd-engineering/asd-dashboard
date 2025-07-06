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
import StorageManager from '../../storage/StorageManager.js'

/** @typedef {import('../../types.js').DashboardConfig} DashboardConfig */
/** @typedef {import('../../types.js').Service} Service */
/** @typedef {import('../../types.js').Board} Board */

const logger = new Logger('fragmentDecisionModal.js')

/**
 * Display modal asking user to overwrite or merge fragment data.
 *
 * @param {{cfgParam:string|null,svcParam:string|null,nameParam:string}} params
 *        cfgParam - Encoded config fragment.
 *        svcParam - Encoded service fragment.
 *        nameParam - Default snapshot name.
 * @function openFragmentDecisionModal
 * @returns {Promise<void>}
 */
export function openFragmentDecisionModal ({ cfgParam, svcParam, nameParam }) {
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

        const nameInput = document.createElement('input')
        nameInput.id = 'importName'
        nameInput.value = nameParam

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

        modal.append(msg1, msg2, nameInput, btnGroup)

        /**
         * Applies the configuration from the URL fragment, either by overwriting or merging.
         * @function applyFragment
         * @param {boolean} overwrite - If true, existing data will be replaced.
         * @returns {Promise<void>}
         */
        async function applyFragment (overwrite) {
          try {
            let cfgObj = StorageManager.getConfig() || {}
            let svcArr = StorageManager.getServices()

            if (cfgParam) {
              const decoded = /** @type {DashboardConfig} */(await gunzipBase64urlToJson(cfgParam))
              if (overwrite) {
                cfgObj = decoded
              } else {
                const currentBoards = StorageManager.getBoards()
                const mergedBoards = mergeBoards(currentBoards, decoded.boards || [])
                cfgObj = { ...cfgObj, ...decoded, boards: mergedBoards }
              }
            }

            if (svcParam) {
              const decodedSvc = /** @type {Array<Service>} */(await gunzipBase64urlToJson(svcParam))
              if (overwrite) {
                svcArr = decodedSvc
              } else {
                svcArr = mergeServices(svcArr, decodedSvc)
              }
            }

            const nameEl = document.getElementById('importName')
            const finalName = nameEl && 'value' in nameEl && typeof nameEl.value === 'string'
              ? nameEl.value.trim() || 'Imported'
              : 'Imported'
            StorageManager.setConfig(cfgObj)
            StorageManager.setServices(svcArr)
            await StorageManager.saveStateSnapshot({ name: finalName, type: 'imported', cfg: cfgParam || '', svc: svcParam || '' })
          } catch (e) {
            logger.error('Error applying fragment:', e)
          } finally {
            closeModal()
            location.reload()
          }
        }
      }
    })
  })
}
