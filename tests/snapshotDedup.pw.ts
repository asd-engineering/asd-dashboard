import { test, expect } from './fixtures'
import { navigate } from './shared/common.js'

// Basic unit tests for merge deduplication

test('mergeBoards removes duplicates by id and name', async ({ page }) => {
  await navigate(page, '/')
  const boards = await page.evaluate(async () => {
    const { mergeBoards } = await import('/utils/merge.js')
    const existing = [{ id: 'a', name: 'Board A', order: 0, views: [] }]
    const incoming = [
      { id: 'a', name: 'Board A', order: 0, views: [] },
      { id: 'b', name: 'Board B', order: 0, views: [] },
      { id: 'c', name: 'board b ', order: 0, views: [] }
    ]
    return mergeBoards(existing, incoming)
  })
  expect(boards).toHaveLength(2)
  expect(boards.map(b => b.id)).toEqual(['a', 'b'])
})

test('mergeServices removes duplicates by id/url and name', async ({ page }) => {
  await navigate(page, '/')
  const services = await page.evaluate(async () => {
    const { mergeServices } = await import('/utils/merge.js')
    const existing = [{ id: 's1', name: 'SvcA', url: 'http://a' }]
    const incoming = [
      { id: 's1', name: 'SvcA ', url: 'http://a' },
      { id: 's2', name: 'SvcB', url: 'http://b' },
      { id: 's3', name: 'svcb', url: 'http://c' }
    ]
    return mergeServices(existing, incoming)
  })
  expect(services).toHaveLength(2)
  expect(services.map(s => s.id)).toEqual(['s1', 's2'])
})
