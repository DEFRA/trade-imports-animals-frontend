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
 *   2. Pre-purge enumeration of group instance-paths from raw storage.
 *      This feeds the applyTo second arg so cross-level gates can be
 *      expressed without in-obligation enumeration.
 *   3. Evaluate each obligation's `applyTo` (if present).
 *   4. Compute effective inScope per obligation — own applyTo inScope
 *      AND every ancestor group's inScope.
 *   5. Purge storage:
 *        - Out-of-scope obligation → drop entire entry.
 *        - Derived indexed leaf → keep only records whose leaf
 *          fulfilmentId is in the `applyTo`-returned set.
 *        - Otherwise → keep (ancestors already in scope).
 *   6. Post-purge enumeration for group implications.
 *   7. Build per-obligation implications (each with a `records` array).
 */

const PATH_DELIMITER = '/'
const joinPath = (segments) => segments.join(PATH_DELIMITER)
const splitPath = (key) => key.split(PATH_DELIMITER)

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

      // 2. Pre-purge enumeration — group instance-paths from raw storage.
      // Feeds applyTo's second arg so gates crossing identity levels
      // (e.g. per-line codes gating per-unit records) can look up
      // parent-group instance-paths without in-obligation enumeration.
      const preEnumeratedGroupPaths = enumerateGroupPathsFromStorage(
        obligations,
        obligationsByCategory,
        obligationAncestorGroups,
        obligationDescendants,
        recognisedFulfilments
      )

      // 3. Run each obligation's applyTo (if it has one).
      const obligationApplicabilityDecisions = runApplicabilityDecisions(
        obligations,
        recognisedFulfilments,
        preEnumeratedGroupPaths
      )

      // 4. Effective inScope — own applyTo AND every ancestor group.
      const isInScope = makeInScopeCheck(
        obligationApplicabilityDecisions,
        obligationAncestorGroups
      )
      for (const o of obligations) isInScope(o)

      // 5. Purge storage.
      const amendedFulfilments = purgeStorage(recognisedFulfilments, {
        obligationsById,
        obligationsByCategory,
        obligationApplicabilityDecisions,
        isInScope
      })

      // 6. Post-purge enumeration — group instance-paths for implication
      // building (accounts for records dropped in step 5).
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

      // 7. Build implications.
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

// ---------------------------------------------------------------------------
// Construction-phase builders — pure functions of the obligations manifest.
// Exported for isolation-testing.
// ---------------------------------------------------------------------------

export function buildObligationsById(obligations) {
  return new Map(obligations.map((o) => [o.id, o]))
}

// Immediate children per obligation, from `within` back-refs.
export function buildObligationChildren(obligations) {
  const obligationChildren = new Map()
  for (const o of obligations) {
    if (o.within) {
      const children = obligationChildren.get(o.within.id) ?? []
      children.push(o)
      obligationChildren.set(o.within.id, children)
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
export function classifyObligations(obligations, obligationChildren) {
  const obligationsByCategory = new Map()
  for (const o of obligations) {
    if (o.indexedBy) {
      obligationsByCategory.set(
        o.id,
        o.indexedBy.source === 'derived' ? 'derived-leaf' : 'user-leaf'
      )
    } else if (o.applyTo && o.within) {
      obligationsByCategory.set(o.id, 'derived-leaf')
    } else if (o.status !== undefined && !o.applyTo) {
      obligationsByCategory.set(o.id, 'field')
    } else if (obligationChildren.has(o.id)) {
      obligationsByCategory.set(o.id, 'group')
    } else {
      obligationsByCategory.set(o.id, 'single')
    }
  }
  return obligationsByCategory
}

// Ancestor groups from root down to immediate parent (excluding self).
export function buildAncestorGroups(obligations) {
  const obligationAncestorGroups = new Map()
  for (const o of obligations) {
    const chain = []
    let cur = o.within
    while (cur) {
      chain.unshift(cur)
      cur = cur.within
    }
    obligationAncestorGroups.set(o.id, chain)
  }
  return obligationAncestorGroups
}

// Transitive descendants (excluding self).
export function buildDescendants(obligations, obligationChildren) {
  const obligationDescendants = new Map()
  for (const o of obligations) {
    const acc = []
    const stack = [...(obligationChildren.get(o.id) ?? [])]
    while (stack.length) {
      const child = stack.pop()
      acc.push(child)
      for (const grandchild of obligationChildren.get(child.id) ?? []) {
        stack.push(grandchild)
      }
    }
    obligationDescendants.set(o.id, acc)
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
  for (const o of obligations) {
    if (obligationsByCategory.get(o.id) !== 'group') {
      continue
    }
    const prefixLen = obligationAncestorGroups.get(o.id).length + 1
    const ids = new Set()
    for (const desc of obligationDescendants.get(o.id)) {
      const stored = fulfilments[desc.id]
      if (!isKeyedRecord(stored)) continue
      for (const key of Object.keys(stored)) {
        const segments = splitPath(key)
        if (segments.length >= prefixLen) {
          ids.add(joinPath(segments.slice(0, prefixLen)))
        }
      }
    }
    paths.set(o.id, [...ids])
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
  for (const o of obligations) {
    if (o.applyTo) {
      obligationApplicabilityDecisions.set(
        o.id,
        o.applyTo(recognisedFulfilments, fulfilmentIdsByObligationId)
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

    if (category === 'derived-leaf') {
      // applyTo returns the leaf fulfilmentIds it currently authorises;
      // keep only stored records whose fulfilmentId is in that set.
      const fulfilmentIds = new Set(
        obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
      )
      const filtered = {}
      for (const [fulfilmentId, recordValue] of Object.entries(
        fulfilment ?? {}
      )) {
        if (fulfilmentIds.has(fulfilmentId)) {
          filtered[fulfilmentId] = recordValue
        }
      }
      if (Object.keys(filtered).length > 0) {
        amendedFulfilments[obligationId] = filtered
      }
    } else if (category === 'single') {
      amendedFulfilments[obligationId] = fulfilment
    } else if (isKeyedRecord(fulfilment)) {
      // field record or user-leaf with a keyed map.
      if (Object.keys(fulfilment).length > 0) {
        amendedFulfilments[obligationId] = fulfilment
      }
    } else {
      amendedFulfilments[obligationId] = fulfilment
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
  for (const o of obligations) {
    if (obligationsByCategory.get(o.id) !== 'group') continue
    if (!isInScope(o)) {
      fulfilmentIdsByObligationId.set(o.id, new Set())
      continue
    }
    const prefixLen = obligationAncestorGroups.get(o.id).length + 1
    const ids = new Set()
    for (const desc of obligationDescendants.get(o.id)) {
      const descendantFulfilment = amendedFulfilments[desc.id]
      if (!isKeyedRecord(descendantFulfilment)) continue
      for (const key of Object.keys(descendantFulfilment)) {
        const segments = splitPath(key)
        if (segments.length >= prefixLen) {
          ids.add(joinPath(segments.slice(0, prefixLen)))
        }
      }
    }
    fulfilmentIdsByObligationId.set(o.id, ids)
  }
  return fulfilmentIdsByObligationId
}

// Step 7: build per-obligation implications by invoking
// `buildImplication` for each obligation in the manifest.
//
// Returns `Object<obligationId, implication>`.
export function buildImplications(obligations, context) {
  const implicationsByObligation = {}
  for (const o of obligations) {
    implicationsByObligation[o.id] = buildImplication(o, context)
  }
  return implicationsByObligation
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

  if (category === 'single') {
    return own ?? { inScope: true }
  }

  if (category === 'group') {
    const fulfilmentIds = [
      ...(fulfilmentIdsByObligationId.get(obligation.id) ?? [])
    ]
    const impl = { inScope: true }
    if (own?.reasons) impl.reasons = own.reasons
    impl.records = fulfilmentIds.map((fulfilmentId) => ({
      fulfilmentId
    }))
    return impl
  }

  if (category === 'field') {
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

  if (category === 'derived-leaf') {
    // Id set comes from applyTo — the authoritative "what records
    // CAN exist". Storage tracks which ones have VALUES.
    const impl = { inScope: true }
    if (own?.reasons) impl.reasons = own.reasons
    const fulfilmentIds = own?.records ?? []
    impl.records = fulfilmentIds.map((fulfilmentId) => ({
      fulfilmentId,
      status: obligation.status
    }))
    return impl
  }

  if (category === 'user-leaf') {
    // Record presence via own storage keys.
    const impl = { inScope: true }
    if (own?.reasons) impl.reasons = own.reasons
    const fulfilment = amendedFulfilments[obligation.id]
    const fulfilmentIds = isKeyedRecord(fulfilment)
      ? Object.keys(fulfilment)
      : []
    impl.records = fulfilmentIds.map((fulfilmentId) => ({
      fulfilmentId,
      status: obligation.status
    }))
    return impl
  }

  return { inScope: true }
}

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

function isKeyedRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
