import { valueAt } from '../../lib/path.js'
import { obligationByPath } from '../../flow/obligation-source.js'
import { entryComplete } from '../../bridge/collection-complete.js'

export const collectionView = (answers, collectionPath) => {
  const templatePath = collectionPath
    .filter((segment) => typeof segment === 'string')
    .join('.')
  const obligation = obligationByPath(templatePath)
  const entries = valueAt(answers, collectionPath) ?? []
  return entries.map((entry, index) => ({
    index,
    path: [...collectionPath, index],
    entry,
    complete: completeAt(obligation, answers, collectionPath, index)
  }))
}

const completeAt = (obligation, answers, collectionPath, index) => {
  if (!obligation) return true
  return entryComplete(answers, collectionPath, index)
}
