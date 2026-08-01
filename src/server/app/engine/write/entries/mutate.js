import { get } from '../../read.js'
import { setAt, valueAt } from '../../../lib/path.js'
import { collectionCapAt } from '../../evaluate/cardinality.js'
import { isValidIndex } from '../pipeline/predicates.js'
import { replaceFromNameKeyedMutation } from '../pipeline/canonical.js'

const validCollectionParents = (answers, collectionPath) => {
  let current = answers
  for (const segment of collectionPath.slice(0, -1)) {
    if (Array.isArray(current)) {
      if (!isValidIndex(segment, current)) return false
      const parent = current[segment]
      if (parent === null || typeof parent !== 'object') return false
    } else if (typeof segment === 'number') {
      return false
    }
    current = current?.[segment]
  }
  return true
}

export const appendEntryAt = async (request, h, collectionPath, entry) => {
  const current = await get(request, h)
  if (!validCollectionParents(current.answers, collectionPath)) return null
  const list = valueAt(current.answers, collectionPath) ?? []
  const cap = collectionCapAt(current.answers, collectionPath)
  if (cap !== null && list.length >= cap) return null
  const answers = setAt(current.answers, collectionPath, [...list, entry])
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'appendEntryAt',
    current.flowOnlyAnswers
  )
  return list.length
}

export const updateEntryAt = async (
  request,
  h,
  collectionPath,
  index,
  entry
) => {
  const current = await get(request, h)
  if (!validCollectionParents(current.answers, collectionPath)) return
  const list = valueAt(current.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    current.answers,
    collectionPath,
    list.with(index, entry)
  )
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'updateEntryAt',
    current.flowOnlyAnswers
  )
}

export const removeEntryAt = async (request, h, collectionPath, index) => {
  const current = await get(request, h)
  if (!validCollectionParents(current.answers, collectionPath)) return
  const list = valueAt(current.answers, collectionPath) ?? []
  if (!isValidIndex(index, list)) return
  const answers = setAt(
    current.answers,
    collectionPath,
    list.toSpliced(index, 1)
  )
  await replaceFromNameKeyedMutation(
    request,
    current.journey,
    answers,
    'removeEntryAt',
    current.flowOnlyAnswers,
    { assertKeys: false }
  )
}
