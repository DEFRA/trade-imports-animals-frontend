import { isAnswered } from '../../lib/answered.js'
import { valueAt } from '../../lib/path.js'
import { registry } from '../../registry.js'

const templatePathOf = (collectionPath) =>
  collectionPath.filter((segment) => typeof segment === 'string').join('.')

/**
 * The collection cardinality link (inc-063, DESIGN-DELTA #15): a collection
 * may declare `maxEntriesFrom` — a reference to a SIBLING count obligation in
 * the frame that holds the collection — and its entry count is then capped at
 * that field's value. `appendEntryAt` rejects an append at the cap.
 *
 * Returns the cap for the collection instance at `collectionPath`, or `null`
 * when uncapped: no `maxEntriesFrom` declared, the count is unanswered, or
 * the stored value is not a non-negative integer. An unanswered count is
 * deliberately NO cap — the per-species at-least-one floor still bites at
 * submit, so leaving the count blank never lets a journey finish early.
 *
 * A-side under BOTH flags (`MODEL=a` and `MODEL=b`). `maxEntriesFrom`
 * (c-031) is the one A-only capability with no B channel — B's decision
 * surface has no numeric reference and no admission-control primitive (PLAN
 * §5.1'). Porting it to B is deferred to inc-024a; until then the cap reads
 * A's cardinality regardless of `MODEL`, mirroring how inc-013 kept A's save
 * layer for both flags.
 */
export const collectionCapAt = (answers, collectionPath) => {
  const obligation = registry.byPath(templatePathOf(collectionPath))
  const countObligation = obligation?.maxEntriesFrom
  if (!countObligation) return null
  const value = valueAt(answers, [
    ...collectionPath.slice(0, -1),
    countObligation.id
  ])
  if (!isAnswered(value)) return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}
