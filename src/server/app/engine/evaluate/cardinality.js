import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'
import { maxEntriesFrom } from '../../bridge/obligation-source.js'

/**
 * The collection cardinality link: a collection whose name is declared on the
 * set manifest's policy.maxEntriesFrom, derived through
 * bridge/obligation-source.js, has its entry count capped at the value of the
 * named sibling count field in the frame that holds it. `appendEntryAt` rejects
 * an append at the cap.
 *
 * Returns the cap for the collection instance at `collectionPath`, or `null`
 * when uncapped: no cap declared, the count is unanswered, or the stored value
 * is not a non-negative integer. An unanswered count is deliberately NO cap —
 * the collection's at-least-one floor still applies at submit, so leaving the
 * count blank never lets a journey finish early.
 *
 * @param {object} answers - the nested answer POJO.
 * @param {Array} collectionPath - a collection path.
 * @returns {number|null} the cap, or null when uncapped.
 */
export const collectionCapAt = (answers, collectionPath) => {
  const collectionName = collectionPath.at(-1)
  const countField = maxEntriesFrom()[collectionName]
  if (!countField) return null
  const value = valueAt(answers, [...collectionPath.slice(0, -1), countField])
  if (!isAnswered(value)) return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}
