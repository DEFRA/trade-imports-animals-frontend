import { valueAt } from '../../lib/path.js'
import { registry } from '../../registry.js'
import { entryComplete } from './complete.js'
import { isModelB } from '../model-flag.js'
import { entryCompleteFromB } from '../../model/bridge/collection-complete.js'

// entries / index / path are A-side under BOTH flags — A owns storage (the
// bridge converts A<->B on demand, B has no persistence), so the positional
// array, index and path are identical under `a` and `b`. Only `complete` is a
// model judgment: under `b` it follows B's per-instance completeness, under
// `a` A's `entryComplete`. Instance identity is positional (the array index),
// preserved under both flags — an empty or partial A entry is never lost.
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
    complete: completeAt(obligation, answers, collectionPath, index, entry)
  }))
}

const completeAt = (obligation, answers, collectionPath, index, entry) => {
  if (!obligation) return true
  if (isModelB()) return entryCompleteFromB(answers, collectionPath, index)
  return entryComplete(obligation, entry)
}
