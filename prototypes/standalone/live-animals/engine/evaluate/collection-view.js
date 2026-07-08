import { valueAt } from '../../lib/path.js'
import { registry } from '../../registry.js'
import { entryComplete } from './complete.js'

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
    complete: obligation ? entryComplete(obligation, entry) : true
  }))
}
