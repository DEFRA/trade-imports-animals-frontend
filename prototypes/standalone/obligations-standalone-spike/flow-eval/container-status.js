import { containerApplies, journeyFlowConditions } from './applies-when.js'
import { isReviewedEmptyCollection } from './collection-review.js'
import { presentedObligations } from './presents.js'

/**
 * The four-status Container taxonomy and its NA-filtered recursive
 * roll-up (obligations.md:1154-1237). Exactly four states — "Cannot start
 * yet" is deliberately not a fifth; blocked Containers collapse to
 * Not Applicable via appliesWhen (obligations.md:1169-1191).
 *
 * Everything here is pure over ObligationEvaluator output; statuses are
 * never stored, always recomputed.
 */

export const NOT_APPLICABLE = 'notApplicable'
export const NOT_STARTED = 'notStarted'
export const IN_PROGRESS = 'inProgress'
export const FULFILLED = 'fulfilled'

export const CONTAINER_STATUSES = Object.freeze([
  NOT_APPLICABLE,
  NOT_STARTED,
  IN_PROGRESS,
  FULFILLED
])

/**
 * The seven-row Group truth table (obligations.md:1226-1234) over child
 * statuses, Not Applicable treated as filtered out: all-F -> Fulfilled;
 * any IP, or F mixed with NS -> In Progress; otherwise Not Started (or
 * Not Applicable when everything was filtered).
 */
export function rollUpChildStatuses(childStatuses) {
  const applicable = childStatuses.filter((status) => status !== NOT_APPLICABLE)
  if (applicable.length === 0) {
    return NOT_APPLICABLE
  }
  const hasFulfilled = applicable.includes(FULFILLED)
  const hasInProgress = applicable.includes(IN_PROGRESS)
  const hasNotStarted = applicable.includes(NOT_STARTED)
  if (hasFulfilled && !hasInProgress && !hasNotStarted) {
    return FULFILLED
  }
  if (hasNotStarted && !hasInProgress && !hasFulfilled) {
    return NOT_STARTED
  }
  return IN_PROGRESS
}

/**
 * Page leaf rule (obligations.md:1203-1204). Works over the presented
 * OBLIGATIONS, not expanded slots, so an in-scope-but-empty mandatory
 * collection (claims with hadClaims yes and the atLeastOne mandate)
 * reads Not Started UNTIL the user continues past its manage list —
 * the reviewed-empty marker then counts it complete for statuses
 * (spike-a's claimsDone, parity ruling c) even though the atLeastOne
 * mandate still blocks the CYA POST. Read-only pages and pages whose
 * presented obligations are all out of scope (the dynamically-empty
 * case, obligations.md:1042-1045) read Not Applicable.
 *
 * [provisional — STATUS-3 vs STATUS-11] A page whose in-scope presented
 * obligations are all engine-optional is Not Applicable (STATUS-3's "no
 * in-scope mandatory obligations" definition) rather than vacuously
 * Fulfilled (STATUS-11 read literally). Labelled per graft 2; see the
 * README provisional-settlements register.
 */
const satisfiedForStatus = ({ entry, obligation }, evaluation) =>
  obligation.fulfilled ||
  isReviewedEmptyCollection(
    entry.obligation,
    obligation,
    evaluation.fulfilments
  )

const pageStatus = (page, evaluation) => {
  const inScope = presentedObligations(page, evaluation).filter(
    ({ obligation }) => obligation.inScope
  )
  if (inScope.length === 0) {
    return NOT_APPLICABLE
  }
  const mandatory = inScope.filter(
    ({ obligation }) => obligation.status === 'mandatory'
  )
  if (mandatory.length === 0) {
    return NOT_APPLICABLE
  }
  if (
    mandatory.every((presented) => satisfiedForStatus(presented, evaluation))
  ) {
    return FULFILLED
  }
  const hasAnyFulfilment = inScope.some(
    ({ obligation }) => obligation.fulfilled
  )
  return hasAnyFulfilment ? IN_PROGRESS : NOT_STARTED
}

/**
 * Status of one Container (Page or Group), recursive for Groups. The
 * appliesWhen gate wins first at every level: a gated-out Container is
 * Not Applicable regardless of its contents.
 */
export function containerStatus(container, evaluation, options = {}) {
  const { conditions = journeyFlowConditions } = options
  if (!containerApplies(container, evaluation, conditions)) {
    return NOT_APPLICABLE
  }
  if (container.kind === 'page') {
    return pageStatus(container, evaluation)
  }
  return rollUpChildStatuses(
    container.children.map((child) =>
      containerStatus(child, evaluation, options)
    )
  )
}
