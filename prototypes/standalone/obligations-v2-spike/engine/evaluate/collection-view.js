import { valueAt } from '../../lib/path.js'
import { registry } from '../../registry.js'
import { entryComplete } from './complete.js'

/**
 * The reusable LOOP primitive — a page LIBRARY, never a framework. Given a
 * collection's path it returns pure STRUCTURAL FACTS about the live instances:
 * `[{ index, path, entry, complete }]` (`entry` is the raw stored answer — a
 * fact, not presentation). It descends by path, so it works at ANY depth
 * (a driver's nested claims sub-hub is `collectionView(answers, ['drivers', i,
 * 'claims'])`). The line it holds: it emits facts (how many entries, each
 * entry's path, whether each entry is complete) and NOTHING presentational — no
 * hrefs, no labels, no copy, no row view-models, no template. The moment a
 * helper turns these facts into govuk rows it has become the rejected generic
 * engine; the list/entry controllers compose all presentation themselves.
 */
export const collectionView = (answers, collectionPath) => {
  const templatePath = collectionPath
    .filter((segment) => typeof segment === 'string')
    .join('.')
  const obligation = registry.byPath(templatePath)
  const entries = valueAt(answers, collectionPath) ?? []
  return entries.map((entry, index) => ({
    index,
    path: [...collectionPath, index],
    entry,
    // A missing/unresolved def path reports the entry complete-by-default;
    // consumers should treat an unknown path as complete.
    complete: obligation ? entryComplete(obligation, entry) : true
  }))
}
