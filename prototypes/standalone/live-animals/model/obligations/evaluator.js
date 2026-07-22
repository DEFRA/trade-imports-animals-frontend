import { obligations as defaultObligations } from './obligations.js'

/**
 * ObligationEvaluator.
 *
 * Pure sync evaluator over the flat, composite-key `fulfilments` map.
 * See obligations.md for the model and FULFILMENT_SHAPES.md for storage
 * examples.
 *
 * Constructed once per Service; each `evaluate(fulfilments)` call is
 * pure. The obligations manifest is injected at construction.
 *
 * Scope resolution: every obligation with an `applyTo` receives
 * `applyTo(fulfilments, fulfilmentIdsByObligationId)` where the second
 * arg is a `Map<obligationId, string[]>` of currently-present
 * group-instance-paths, enumerated pre-purge from raw storage. This
 * lets gated obligations look up their parent-group's instance-paths
 * without enumerating storage themselves — see `helpers.js` for the
 * common gate shapes (`allowListed`, `allowListedByPredicate`,
 * `branchedGate`, `anyAllowListed`).
 *
 * Algorithm per call:
 *
 *   1. Drop unknown obligation ids (tolerate-and-amend).
 *   2. Converge on the post-purge view via fixpoint iteration:
 *      repeat {enumerate group paths → evaluate `applyTo` →
 *      compute effective inScope → purge storage} until the
 *      fulfilments map stops changing. Every `applyTo` is thus
 *      exercised against the same post-purge view all other gates
 *      see — a value this call is purging cannot silently drive
 *      another gate. Bounded by `MAX_PURGE_ITERATIONS` for safety;
 *      convergence typically hits in 1-2 iterations for real
 *      manifests because `purgeStorage` is monotonic (never adds).
 *   3. Post-purge enumeration for group implications.
 *   4. Build per-obligation implications (category-specific shape;
 *      groups/leaves carry a `records` array).
 */

const PATH_DELIMITER = '/'
const joinPath = (segments) => segments.join(PATH_DELIMITER)
const splitPath = (key) => key.split(PATH_DELIMITER)

// Fixpoint safety cap for the applyTo/purge convergence loop. Real
// manifests are expected to converge in 1-2 iterations because
// `purgeStorage` is monotonic on storage (never adds), but a
// pathological gate design (e.g. an `applyTo` that flips inScope
// based on absence) could oscillate. Throwing after this cap is a
// louder signal than silently truncating.
const MAX_PURGE_ITERATIONS = 16

export function createObligationEvaluator({
  obligations = defaultObligations
} = {}) {
  const obligationsById = buildObligationsById(obligations)
  const obligationChildren = buildObligationChildren(obligations)
  const obligationsByCategory = classifyObligations(
    obligations,
    obligationChildren
  )
  const obligationAncestorGroups = buildAncestorGroups(obligations)
  const obligationDescendants = buildDescendants(
    obligations,
    obligationChildren
  )

  return {
    evaluate(fulfilments) {
      // 1. Drop unknown obligation ids.
      const recognisedFulfilments = dropUnknownFulfilments(
        fulfilments,
        obligationsById
      )

      // 2. Fixpoint: converge applyTo + purge on a stable post-purge
      // view. Each iteration enumerates group paths from the current
      // view, runs applyTo against that view, computes effective
      // inScope, and purges storage. When the view stops changing,
      // every applyTo has been exercised against the same post-purge
      // fulfilments — a value purged in this call cannot leak into
      // another gate's decision (the two-hop failure mode where a
      // purged value silently drives a second gate).
      const {
        amendedFulfilments,
        obligationApplicabilityDecisions,
        isInScope
      } = convergePurge(recognisedFulfilments, {
        obligations,
        obligationsById,
        obligationsByCategory,
        obligationAncestorGroups,
        obligationDescendants
      })

      // 3. Post-purge enumeration — group instance-paths for implication
      // building (accounts for records dropped by the converged purge).
      const fulfilmentIdsByObligationId = enumerateGroupFulfilmentIds(
        obligations,
        {
          obligationsByCategory,
          obligationAncestorGroups,
          obligationDescendants,
          isInScope,
          amendedFulfilments
        }
      )

      // 4. Build implications.
      const implicationsByObligation = buildImplications(obligations, {
        isInScope,
        obligationsByCategory,
        obligationApplicabilityDecisions,
        fulfilmentIdsByObligationId,
        amendedFulfilments
      })

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}

// Fixpoint loop: repeat {enumerate → applyTo → isInScope → purge}
// until the view stops shrinking. Each iteration replaces the view
// with the just-purged fulfilments, so the next applyTo sees exactly
// what every other gate is going to see.
//
// Bounded by `MAX_PURGE_ITERATIONS`; throws if we exceed the cap so
// a pathological gate design fails loudly rather than silently
// truncating at some arbitrary iteration.
//
// Returns the final `{ amendedFulfilments, obligationApplicabilityDecisions,
// isInScope }` — the caller feeds these to enumeration + implication
// building.
export function convergePurge(recognisedFulfilments, context) {
  const {
    obligations,
    obligationsById,
    obligationsByCategory,
    obligationAncestorGroups,
    obligationDescendants
  } = context

  let view = recognisedFulfilments
  let obligationApplicabilityDecisions
  let isInScope

  for (let iteration = 0; iteration < MAX_PURGE_ITERATIONS; iteration++) {
    const groupPaths = enumerateGroupPathsFromStorage(
      obligations,
      obligationsByCategory,
      obligationAncestorGroups,
      obligationDescendants,
      view
    )
    obligationApplicabilityDecisions = runApplicabilityDecisions(
      obligations,
      view,
      groupPaths
    )
    isInScope = makeInScopeCheck(
      obligationApplicabilityDecisions,
      obligationAncestorGroups
    )
    for (const obligation of obligations) isInScope(obligation)

    const next = purgeStorage(view, {
      obligationsById,
      obligationsByCategory,
      obligationApplicabilityDecisions,
      isInScope
    })

    if (viewsEqual(view, next)) {
      return {
        amendedFulfilments: next,
        obligationApplicabilityDecisions,
        isInScope
      }
    }
    view = next
  }
  throw new Error(
    `ObligationEvaluator: applyTo/purge did not converge within ${MAX_PURGE_ITERATIONS} iterations — check for oscillating gate design`
  )
}

// ---------------------------------------------------------------------------
// Construction-phase builders — pure functions of the obligations manifest.
// Exported for isolation-testing.
// ---------------------------------------------------------------------------

export function buildObligationsById(obligations) {
  return new Map(obligations.map((obligation) => [obligation.id, obligation]))
}

// Immediate children per obligation, from `within` back-refs.
export function buildObligationChildren(obligations) {
  const obligationChildren = new Map()
  for (const obligation of obligations) {
    if (obligation.within) {
      const children = obligationChildren.get(obligation.within.id) ?? []
      children.push(obligation)
      obligationChildren.set(obligation.within.id, children)
    }
  }
  return obligationChildren
}

// Classify each obligation into one of the categories used by the
// pipeline branches. Under the applyTo + helpers model:
//   'derived-leaf' — indexed leaf with imperative scope: either
//                    `indexedBy.source === 'derived'`, OR `applyTo`
//                    present alongside `within` (leaf inside a group).
//                    In both shapes purge filters records by
//                    applyTo's `records` set.
//   'user-leaf'    — indexedBy present, non-derived source (ids from
//                    own storage).
//   'field'        — has `status`, no `applyTo`, no `indexedBy`
//                    (always-in-scope-for-parent-group leaf).
//   'group'        — has children via `within` back-refs.
//   'single'       — otherwise (scalar leaf value at fulfilments[o.id]).
const categoryOf = (obligation, obligationChildren) => {
  if (obligation.indexedBy) {
    return obligation.indexedBy.source === 'derived'
      ? 'derived-leaf'
      : 'user-leaf'
  }
  if (obligation.applyTo && obligation.within) return 'derived-leaf'
  if (obligation.status !== undefined && !obligation.applyTo) return 'field'
  if (obligationChildren.has(obligation.id)) return 'group'
  return 'single'
}

export function classifyObligations(obligations, obligationChildren) {
  const obligationsByCategory = new Map()
  for (const obligation of obligations) {
    obligationsByCategory.set(
      obligation.id,
      categoryOf(obligation, obligationChildren)
    )
  }
  return obligationsByCategory
}

// Ancestor groups from root down to immediate parent (excluding self).
export function buildAncestorGroups(obligations) {
  const obligationAncestorGroups = new Map()
  for (const obligation of obligations) {
    const chain = []
    let cur = obligation.within
    while (cur) {
      chain.unshift(cur)
      cur = cur.within
    }
    obligationAncestorGroups.set(obligation.id, chain)
  }
  return obligationAncestorGroups
}

// Transitive descendants (excluding self).
export function buildDescendants(obligations, obligationChildren) {
  const obligationDescendants = new Map()
  for (const obligation of obligations) {
    const acc = []
    const stack = [...(obligationChildren.get(obligation.id) ?? [])]
    while (stack.length) {
      const child = stack.pop()
      acc.push(child)
      for (const grandchild of obligationChildren.get(child.id) ?? []) {
        stack.push(grandchild)
      }
    }
    obligationDescendants.set(obligation.id, acc)
  }
  return obligationDescendants
}

// ---------------------------------------------------------------------------
// Evaluate-phase helpers — pure functions used per `evaluate` call.
// Exported for isolation-testing.
// ---------------------------------------------------------------------------

// Step 1: drop fulfilments whose obligation id is not in the current
// manifest ("tolerate-and-amend").
export function dropUnknownFulfilments(fulfilments, obligationsById) {
  const recognisedFulfilments = {}
  for (const [obligationId, fulfilment] of Object.entries(fulfilments)) {
    if (obligationsById.has(obligationId)) {
      recognisedFulfilments[obligationId] = fulfilment
    }
  }
  return recognisedFulfilments
}

// The instance-path prefixes one descendant's stored keyed-record
// contributes to its group's instance-id set.
const instancePathPrefixesFromRecord = (stored, prefixLen) => {
  if (!isKeyedRecord(stored)) return []
  return Object.keys(stored)
    .map((key) => splitPath(key))
    .filter((segments) => segments.length >= prefixLen)
    .map((segments) => joinPath(segments.slice(0, prefixLen)))
}

// A group's instance-id set: the union, across every descendant, of the
// instance-path prefixes of its stored composite keys. `storedFor`
// resolves a descendant to its stored fulfilment (pre- or post-purge,
// depending on the caller).
const groupInstancePaths = (
  obligation,
  obligationAncestorGroups,
  obligationDescendants,
  storedFor
) => {
  const prefixLen = obligationAncestorGroups.get(obligation.id).length + 1
  const ids = new Set()
  for (const desc of obligationDescendants.get(obligation.id)) {
    for (const id of instancePathPrefixesFromRecord(
      storedFor(desc),
      prefixLen
    )) {
      ids.add(id)
    }
  }
  return ids
}

// Step 2: pre-purge enumeration of group instance-paths from raw
// storage. Same shape as `enumerateGroupFulfilmentIds` (step 6) but
// without an `isInScope` filter — pre-purge, so no scope decisions
// have been made yet.
//
// Returns `Map<groupId, string[]>`. Groups without any descendant
// storage get an empty array.
export function enumerateGroupPathsFromStorage(
  obligations,
  obligationsByCategory,
  obligationAncestorGroups,
  obligationDescendants,
  fulfilments
) {
  const paths = new Map()
  for (const obligation of obligations) {
    if (obligationsByCategory.get(obligation.id) !== 'group') {
      continue
    }
    const ids = groupInstancePaths(
      obligation,
      obligationAncestorGroups,
      obligationDescendants,
      (desc) => fulfilments[desc.id]
    )
    paths.set(obligation.id, [...ids])
  }
  return paths
}

// Step 3: evaluate each obligation's applyTo (if it has one).
// `applyTo(fulfilments, fulfilmentIdsByObligationId)` — the second arg
// is the pre-purge group-paths map from step 2.
//
// Returns `Map<obligationId, applyTo return>`.
export function runApplicabilityDecisions(
  obligations,
  recognisedFulfilments,
  fulfilmentIdsByObligationId = new Map()
) {
  const obligationApplicabilityDecisions = new Map()
  for (const obligation of obligations) {
    if (obligation.applyTo) {
      obligationApplicabilityDecisions.set(
        obligation.id,
        obligation.applyTo(recognisedFulfilments, fulfilmentIdsByObligationId)
      )
    }
  }
  return obligationApplicabilityDecisions
}

// Step 4: build a memoised effective-inScope predicate.
//
// `isInScope(obligation) → boolean` ANDs the obligation's own applyTo
// inScope with every ancestor group's inScope. Results are cached
// inside the closure across calls; the caller can optionally warm
// the cache by invoking it for every obligation up front.
export function makeInScopeCheck(
  obligationApplicabilityDecisions,
  obligationAncestorGroups
) {
  const inScopeCache = new Map()
  const isInScope = (obligation) => {
    if (inScopeCache.has(obligation.id)) {
      return inScopeCache.get(obligation.id)
    }
    const own = obligationApplicabilityDecisions.get(obligation.id)
    if (own && own.inScope === false) {
      inScopeCache.set(obligation.id, false)
      return false
    }
    for (const ancestor of obligationAncestorGroups.get(obligation.id)) {
      if (!isInScope(ancestor)) {
        inScopeCache.set(obligation.id, false)
        return false
      }
    }
    inScopeCache.set(obligation.id, true)
    return true
  }
  return isInScope
}

// applyTo returns the leaf fulfilmentIds it currently authorises; keep
// only stored records whose fulfilmentId is in that set. `{ keep: false }`
// when nothing survives the filter.
const purgedDerivedLeaf = (
  obligation,
  fulfilment,
  obligationApplicabilityDecisions
) => {
  const fulfilmentIds = new Set(
    obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
  )
  const filtered = {}
  for (const [fulfilmentId, recordValue] of Object.entries(fulfilment ?? {})) {
    if (fulfilmentIds.has(fulfilmentId)) {
      filtered[fulfilmentId] = recordValue
    }
  }
  return Object.keys(filtered).length > 0
    ? { keep: true, value: filtered }
    : { keep: false }
}

// field record or user-leaf with a keyed map — drop only if it's empty.
const purgedKeyedRecord = (fulfilment) =>
  Object.keys(fulfilment).length > 0
    ? { keep: true, value: fulfilment }
    : { keep: false }

const purgedFulfilmentFor = (
  obligation,
  fulfilment,
  category,
  obligationApplicabilityDecisions
) => {
  if (category === 'derived-leaf') {
    return purgedDerivedLeaf(
      obligation,
      fulfilment,
      obligationApplicabilityDecisions
    )
  }
  if (category === 'single') return { keep: true, value: fulfilment }
  if (isKeyedRecord(fulfilment)) return purgedKeyedRecord(fulfilment)
  return { keep: true, value: fulfilment }
}

// Step 5: purge storage.
//   - Out-of-scope obligation → drop entire entry.
//   - Derived indexed leaf → keep only records whose fulfilmentId is in
//     the `applyTo`-returned set.
//   - Otherwise → keep as-is (ancestors already in scope, own storage
//     is self-valid for field records and user-driven indexed leaves).
export function purgeStorage(recognisedFulfilments, context) {
  const {
    obligationsById,
    obligationsByCategory,
    obligationApplicabilityDecisions,
    isInScope
  } = context

  const amendedFulfilments = {}
  for (const [obligationId, fulfilment] of Object.entries(
    recognisedFulfilments
  )) {
    const obligation = obligationsById.get(obligationId)
    if (!isInScope(obligation)) continue

    const category = obligationsByCategory.get(obligation.id)
    const purged = purgedFulfilmentFor(
      obligation,
      fulfilment,
      category,
      obligationApplicabilityDecisions
    )
    if (purged.keep) {
      amendedFulfilments[obligationId] = purged.value
    }
  }
  return amendedFulfilments
}

// Step 6: enumerate each group's instance ids by scanning descendants'
// composite-key prefixes on POST-purge storage.
//
// A group's instance fulfilmentId is the first N segments of any
// descendant leaf's composite fulfilmentId, where N =
// ancestorGroups.length + 1. Union across all descendants. Out-of-
// scope groups map to an empty Set.
//
// Returns `Map<group obligation id, Set<group fulfilmentId>>`.
export function enumerateGroupFulfilmentIds(obligations, context) {
  const {
    obligationsByCategory,
    obligationAncestorGroups,
    obligationDescendants,
    isInScope,
    amendedFulfilments
  } = context

  const fulfilmentIdsByObligationId = new Map()
  for (const obligation of obligations) {
    if (obligationsByCategory.get(obligation.id) !== 'group') continue
    if (!isInScope(obligation)) {
      fulfilmentIdsByObligationId.set(obligation.id, new Set())
      continue
    }
    const ids = groupInstancePaths(
      obligation,
      obligationAncestorGroups,
      obligationDescendants,
      (desc) => amendedFulfilments[desc.id]
    )
    fulfilmentIdsByObligationId.set(obligation.id, ids)
  }
  return fulfilmentIdsByObligationId
}

// Step 7: build per-obligation implications by invoking
// `buildImplication` for each obligation in the manifest.
//
// Returns `Object<obligationId, implication>`.
export function buildImplications(obligations, context) {
  const implicationsByObligation = {}
  for (const obligation of obligations) {
    implicationsByObligation[obligation.id] = buildImplication(
      obligation,
      context
    )
  }
  return implicationsByObligation
}

const singleImplication = (own) => own ?? { inScope: true }

const groupImplication = (obligation, own, fulfilmentIdsByObligationId) => {
  const fulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.id) ?? [])
  ]
  const impl = { inScope: true }
  if (own?.reasons) impl.reasons = own.reasons
  impl.records = fulfilmentIds.map((fulfilmentId) => ({ fulfilmentId }))
  return impl
}

// Two shapes land here:
//   1. Group-scoped field record (`within` set) — enumerate the parent
//      group's instance-paths and stamp each one with `obligation.status`.
//   2. Top-level scalar with intrinsic status (no `within`) — the natural
//      data-only shape for an always-in-scope obligation. There is no
//      parent group to enumerate, so return the status directly,
//      mirroring what `applyTo: () => ({ inScope: true, status })` would
//      return.
const fieldImplication = (obligation, fulfilmentIdsByObligationId) => {
  if (!obligation.within) {
    return { inScope: true, status: obligation.status }
  }
  const parentGroupFulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.within.id) ?? [])
  ]
  return {
    inScope: true,
    records: parentGroupFulfilmentIds.map((fulfilmentId) => ({
      fulfilmentId,
      status: obligation.status
    }))
  }
}

// Id set comes from applyTo — the authoritative "what records CAN exist".
// Storage tracks which ones have VALUES.
const derivedLeafImplication = (obligation, own) => {
  const impl = { inScope: true }
  if (own?.reasons) impl.reasons = own.reasons
  const fulfilmentIds = own?.records ?? []
  impl.records = fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status
  }))
  return impl
}

// Record presence via own storage keys.
const userLeafImplication = (obligation, own, amendedFulfilments) => {
  const impl = { inScope: true }
  if (own?.reasons) impl.reasons = own.reasons
  const fulfilment = amendedFulfilments[obligation.id]
  const fulfilmentIds = isKeyedRecord(fulfilment) ? Object.keys(fulfilment) : []
  impl.records = fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status
  }))
  return impl
}

// Build one obligation's implication given the evaluate-call context.
//
// Returns `{ inScope: false }` if the obligation is out of scope.
// Otherwise returns the category-specific implication.
export function buildImplication(obligation, context) {
  const {
    isInScope,
    obligationsByCategory,
    obligationApplicabilityDecisions,
    fulfilmentIdsByObligationId,
    amendedFulfilments
  } = context

  if (!isInScope(obligation)) return { inScope: false }

  const category = obligationsByCategory.get(obligation.id)
  const own = obligationApplicabilityDecisions.get(obligation.id)

  switch (category) {
    case 'single':
      return singleImplication(own)
    case 'group':
      return groupImplication(obligation, own, fulfilmentIdsByObligationId)
    case 'field':
      return fieldImplication(obligation, fulfilmentIdsByObligationId)
    case 'derived-leaf':
      return derivedLeafImplication(obligation, own)
    case 'user-leaf':
      return userLeafImplication(obligation, own, amendedFulfilments)
    default:
      return { inScope: true }
  }
}

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

function isKeyedRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// purge may recreate keyed-record entries — compare their keys.
const keyedRecordsEqual = (recordA, recordB) => {
  const recordKeysA = Object.keys(recordA)
  const recordKeysB = Object.keys(recordB)
  if (recordKeysA.length !== recordKeysB.length) return false
  for (const recordKey of recordKeysA) {
    if (!Object.hasOwn(recordB, recordKey)) return false
    if (recordA[recordKey] !== recordB[recordKey]) return false
  }
  return true
}

// Structural equality between two fulfilment views (obligation-id → value).
// Used by the purge fixpoint to detect convergence. Values are compared by
// reference at the top level (purge only ever drops keys or filters
// derived-leaf record maps into a fresh object, so a stable iteration
// re-uses the previous object refs for untouched entries; a filter
// produces a new object even when its contents are identical, which we
// resolve by deep-comparing the keyed-record case).
function viewsEqual(viewA, viewB) {
  if (viewA === viewB) return true
  const keysA = Object.keys(viewA)
  const keysB = Object.keys(viewB)
  if (keysA.length !== keysB.length) return false
  for (const key of keysA) {
    if (!Object.hasOwn(viewB, key)) return false
    const valueA = viewA[key]
    const valueB = viewB[key]
    if (valueA === valueB) continue
    if (isKeyedRecord(valueA) && isKeyedRecord(valueB)) {
      if (keyedRecordsEqual(valueA, valueB)) continue
      return false
    }
    return false
  }
  return true
}
