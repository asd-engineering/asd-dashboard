import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, setConfigAndServices, evaluateSafe } from './shared/common.js'
import { injectSnapshot, mergeSnapshotByName } from './shared/state.js'


test('merge snapshot unions boards and services without duplicates', async ({ page }) => {
  await navigate(page,'/')
  const stateA = { ...ciConfig, boards: [ciBoards[0]] }

  await setConfigAndServices(page, stateA, [ciServices[0]]);

  const serviceDup = { ...ciServices[0], id: 'toolbox-copy', name: 'ASD-toolbox ' }
  const stateBBoards = [ciBoards[0], ciBoards[1]]
  const stateBServices = [ciServices[1], serviceDup]

  await injectSnapshot(page, { ...ciConfig, boards: stateBBoards }, stateBServices, 'export/stateB')
  await mergeSnapshotByName(page, 'export/stateB')
  
  const final = await evaluateSafe(page, async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return { boards: sm.getConfig().boards.length, services: sm.getServices().length }
  })
  expect(final.boards).toBe(2)
  expect(final.services).toBe(2)
})
