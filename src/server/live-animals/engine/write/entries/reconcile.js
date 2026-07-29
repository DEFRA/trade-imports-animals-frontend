import { get } from '../../read.js'
import { setAt, valueAt } from '../../../lib/path.js'
import { replaceFromNameKeyedMutation } from '../pipeline/canonical.js'

export const reconcileEntriesAt = async (
  request,
  h,
  collectionPath,
  keyOf,
  entries
) => {
  const current = await get(request, h)
  const list = valueAt(current.answers, collectionPath) ?? []
  const existingByKey = new Map(list.map((entry) => [keyOf(entry), entry]))
  const next = entries.map((entry) => existingByKey.get(keyOf(entry)) ?? entry)
  const answers = setAt(current.answers, collectionPath, next)
  const view = await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'reconcileEntriesAt',
    current.flowOnlyAnswers
  )
  return { answers: view.answers, scope: view.scope }
}
