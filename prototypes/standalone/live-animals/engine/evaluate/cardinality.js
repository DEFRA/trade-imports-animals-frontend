import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'
import { MAX_ENTRIES_FROM } from '../../flow/obligation-source.js'

/**
 * The collection cardinality link: a collection whose name is declared
 * in `MAX_ENTRIES_FROM` has its entry count capped at the value of the named
 * sibling count field in the frame that holds it. `appendEntryAt` rejects an
 * append at the cap.
 *
 * Returns the cap for the collection instance at `collectionPath`, or `null`
 * when uncapped: no cap declared, the count is unanswered, or the stored value
 * is not a non-negative integer. An unanswered count is deliberately NO cap —
 * the per-species at-least-one floor still bites at submit, so leaving the
 * count blank never lets a journey finish early.
 */
export const collectionCapAt = (answers, collectionPath) => {
  const collectionName = collectionPath[collectionPath.length - 1]
  const countField = MAX_ENTRIES_FROM[collectionName]
  if (!countField) return null
  const value = valueAt(answers, [...collectionPath.slice(0, -1), countField])
  if (!isAnswered(value)) return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}
