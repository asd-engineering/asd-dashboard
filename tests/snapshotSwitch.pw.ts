import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, clearStorage, wipeConfigPreserveSnapshots, evaluateSafe } from './shared/common.js'
import { injectSnapshot, switchSnapshotByName } from './shared/state.js'


test('switch restores board and view ids with widgets', async ({ page }) => {
  await clearStorage(page)
  await navigate(page,'/')
  const baselineCfg = { ...ciConfig, boards: ciBoards }
  
  await injectSnapshot(page, baselineCfg, ciServices, 'export/base')
  await wipeConfigPreserveSnapshots(page);
  await switchSnapshotByName(page, 'export/base');

  const result = await evaluateSafe(page, async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js');
    const cfg = sm.getConfig();
    return {
      boardId: sm.misc.getLastBoardId(),
      viewId: sm.misc.getLastViewId(),
      widgets: cfg.boards?.[0]?.views?.[0]?.widgetState.length || 0
    };
  });

  expect(result.boardId).toBe(ciBoards[0].id)
  expect(result.viewId).toBe(ciBoards[0].views[0].id)
  expect(result.widgets).toBeGreaterThan(0)
  expect(result.boardId).not.toBe(ciConfig.globalSettings.localStorage.defaultBoard)
})
