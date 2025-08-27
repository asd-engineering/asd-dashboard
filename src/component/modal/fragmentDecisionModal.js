// @ts-check
/**
 * Modal prompting user to merge or switch when a config fragment is detected.
 *
 * @module fragmentDecisionModal
 */
import { openModal } from './modalFactory.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'
import { decodeConfig } from '../../utils/compression.js'
import { mergeBoards, mergeServices } from '../../utils/merge.js'
import { Logger } from '../../utils/Logger.js'
import { showNotification } from '../dialog/notification.js'
import { StorageManager } from '../../storage/StorageManager.js'
import { restoreDeep } from '../../utils/minimizer.js'
import { DEFAULT_CONFIG_TEMPLATE } from '../../storage/defaultConfig.js'
import { FRAG_MINIMIZE_ENABLED } from '../../utils/fragmentConstants.js'

/** @typedef {import('../../types.js').DashboardConfig} DashboardConfig */
/** @typedef {import('../../types.js').Service} Service */
/** @typedef {import('../../types.js').Board} Board */

const logger = new Logger('fragmentDecisionModal.js')

// Mirror the key map used during export. Keep this in sync.
/** @type {Record<string,string>} */
const KEY_MAP = {
  // e.g. 'serviceId': 'i'
}

/**
 * Display modal asking user to switch or merge fragment data.
 *
 * @param {{cfgParam:string|null,svcParam:string|null,nameParam:string,algoParam?:string|null,ccParam?:string|null}} params
 *        cfgParam - Encoded config fragment.
 *        svcParam - Encoded service fragment.
 *        nameParam - Default snapshot name.
 * @function openFragmentDecisionModal
 * @returns {Promise<void>}
 */
export function openFragmentDecisionModal ({ cfgParam, svcParam, nameParam, algoParam, ccParam }) {
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

        const switchBtn = document.createElement('button')
        switchBtn.id = 'switch-environment'
        switchBtn.textContent = '⬇ Switch and autosave'
        switchBtn.classList.add('modal__btn', 'modal__btn--save')
        switchBtn.addEventListener('click', async () => {
          await applyFragment(true)
        })

        const mergeBtn = document.createElement('button')
        mergeBtn.id = 'merge-environment'
        mergeBtn.textContent = '➕ Merge into current setup'
        mergeBtn.classList.add('modal__btn', 'modal__btn--danger')
        mergeBtn.addEventListener('click', async () => {
          await applyFragment(false)
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.id = 'cancel-environment'
        cancelBtn.textContent = '✖ Cancel'
        cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
        cancelBtn.addEventListener('click', closeModal)

        const btnGroup = document.createElement('div')
        btnGroup.classList.add('modal__btn-group')
        btnGroup.append(switchBtn, mergeBtn, cancelBtn)

        modal.append(msg1, msg2, nameInput, btnGroup)

        /**
         * Applies the configuration from the URL fragment, either by switching or merging.
         * @function applyFragment
         * @param {boolean} overwrite - If true, existing data will be replaced.
         * @returns {Promise<void>}
         */
        async function applyFragment (overwrite) {
          try {
            const algo = /** @type {'gzip'|'deflate'} */ (algoParam || new URLSearchParams(location.hash.slice(1)).get('algo') || 'gzip')
            const cc = ccParam || new URLSearchParams(location.hash.slice(1)).get('cc')
            const checks = cc ? cc.split(',') : []
            const cfgChecksum = checks[0] || null
            const svcChecksum = checks[1] || null

            let cfgObj = StorageManager.getConfig() || {}
            let svcArr = StorageManager.getServices()

            if (cfgParam) {
              const decoded = /** @type {DashboardConfig} */(
                await decodeConfig(cfgParam, {
                  algo,
                  keyMap: KEY_MAP,
                  expectChecksum: cfgChecksum
                })
              )
              const cfgFull = FRAG_MINIMIZE_ENABLED
                ? restoreDeep(decoded, DEFAULT_CONFIG_TEMPLATE)
                : decoded
              if (overwrite) {
                cfgObj = cfgFull
              } else {
                const currentBoards = StorageManager.getBoards()
                const mergedBoards = mergeBoards(currentBoards, cfgFull.boards || [])
                cfgObj = { ...cfgObj, ...cfgFull, boards: mergedBoards }
              }
            }

            if (svcParam) {
              const decodedSvc = /** @type {Array<Service>} */(
                await decodeConfig(svcParam, {
                  algo,
                  keyMap: KEY_MAP,
                  expectChecksum: svcChecksum
                })
              )
              const svcFull = FRAG_MINIMIZE_ENABLED
                ? restoreDeep(decodedSvc, [])
                : decodedSvc
              if (overwrite) {
                svcArr = svcFull
              } else {
                svcArr = mergeServices(svcArr, svcFull)
              }
            }

            const nameEl = document.getElementById('importName')
            const finalName = nameEl && 'value' in nameEl && typeof nameEl.value === 'string'
              ? nameEl.value.trim() || 'Imported'
              : 'Imported'
            await StorageManager.saveStateSnapshot({
              name: finalName,
              type: 'imported',
              cfg: cfgParam ?? '',
              svc: svcParam ?? ''
            })
            StorageManager.setConfig(cfgObj)
            StorageManager.setServices(svcArr)
          } catch (e) {
            logger.error('Error applying fragment:', e)
            showNotification('Failed to decode configuration from the URL fragment.', 4000, 'error')
          } finally {
            closeModal()
            location.reload()
          }
        }
      }
    })
  })
}
