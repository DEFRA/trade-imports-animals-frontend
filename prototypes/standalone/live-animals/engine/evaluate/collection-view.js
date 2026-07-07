import { valueAt } from '../../lib/path.js'
import { registry } from '../../registry.js'
import { entryComplete } from './complete.js'

/** Structural facts about a collection's live instances: `[{ index, path, entry, complete }]`. */
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
    // A missing/unresolved def path reports the entry complete-by-default.
    complete: obligation ? entryComplete(obligation, entry) : true
  }))
}
