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
 * Algorithm per call:
 *
 *   1. Drop unknown obligation ids (tolerate-and-amend).
 *   2. Evaluate each obligation's `applyTo` (if present).
 *   3. Compute effective inScope per obligation — own applyTo inScope
 *      AND every ancestor group's inScope.
 *   4. Purge storage:
 *        - Out-of-scope obligation → drop entire entry.
 *        - Derived indexed leaf → keep only records whose leaf
 *          fulfilmentId is in the `applyTo`-returned set. See
 *          obligations.md §Terminology.
 *        - Otherwise → keep (ancestors already in scope).
 *   5. Enumerate group instance ids by scanning descendants'
 *      composite-key prefixes.
 *   6. Build per-obligation implications (each with a `records` array).
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

      // 2. Run each obligation's applyTo (if it has one).
      const obligationApplicabilityDecisions = runApplicabilityDecisions(
        obligations,
        recognisedFulfilments
      )

      // 3. Effective inScope — own applyTo AND every ancestor group.
      const isInScope = makeInScopeCheck(
        obligationApplicabilityDecisions,
        obligationAncestorGroups
      )
      for (const o of obligations) isInScope(o)

      // 4. Purge storage.
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
          //
          // The spike's only derived leaf (`modificationCost`) is
          // top-level, so its stored fulfilmentIds are single-segment
          // strings ('turbo', 'alloys' …) and match applyTo's return
          // directly. A future nested derived leaf (leaf inside a group)
          // would need applyTo to return composite paths (e.g.
          // 'd1/turbo') to preserve the direct-match contract.
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
        } else {
          // field record or user-leaf: keep as-is.
          if (
            fulfilment &&
            typeof fulfilment === 'object' &&
            !Array.isArray(fulfilment)
          ) {
            if (Object.keys(fulfilment).length > 0) {
              amendedFulfilments[obligationId] = fulfilment
            }
          } else {
            amendedFulfilments[obligationId] = fulfilment
          }
        }
      }

      // 5. Enumerate each group's instance ids from descendants' storage.
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
          if (
            !descendantFulfilment ||
            typeof descendantFulfilment !== 'object'
          ) {
            continue
          }
          if (Array.isArray(descendantFulfilment)) continue
          for (const key of Object.keys(descendantFulfilment)) {
            const segments = splitPath(key)
            if (segments.length >= prefixLen) {
              ids.add(joinPath(segments.slice(0, prefixLen)))
            }
          }
        }
        fulfilmentIdsByObligationId.set(o.id, ids)
      }

      // 6. Build implications.
      const implicationContext = {
        isInScope,
        obligationsByCategory,
        obligationApplicabilityDecisions,
        fulfilmentIdsByObligationId,
        amendedFulfilments
      }
      const implicationsByObligation = {}
      for (const o of obligations) {
        implicationsByObligation[o.id] = buildImplication(o, implicationContext)
      }

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

// Classify each obligation into one of the five categories from
// obligations.js's block comment.
//   'derived-leaf' — indexedBy.source === 'derived' (id set from applyTo)
//   'user-leaf'    — indexedBy present, non-derived source (ids from own storage)
//   'field'        — has `status`, no `applyTo`, no `indexedBy`
//   'group'        — has children via `within` back-refs, no `status`/`indexedBy`
//   'single'       — otherwise (leaf value at fulfilments[o.id])
export function classifyObligations(obligations, obligationChildren) {
  const obligationsByCategory = new Map()
  for (const o of obligations) {
    if (o.indexedBy) {
      obligationsByCategory.set(
        o.id,
        o.indexedBy.source === 'derived' ? 'derived-leaf' : 'user-leaf'
      )
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

// Step 2: evaluate each obligation's applyTo (if it has one) against the
// recognised fulfilments; return a Map<obligationId, applyTo return>.
export function runApplicabilityDecisions(obligations, recognisedFulfilments) {
  const obligationApplicabilityDecisions = new Map()
  for (const o of obligations) {
    if (o.applyTo) {
      obligationApplicabilityDecisions.set(
        o.id,
        o.applyTo(recognisedFulfilments)
      )
    }
  }
  return obligationApplicabilityDecisions
}

// Step 3: build a memoised effective-inScope predicate.
//
// Returns a function `isInScope(obligation) → boolean` that ANDs the
// obligation's own applyTo inScope with every ancestor group's inScope.
// Results are cached inside the closure across calls; the caller can
// optionally warm the cache by invoking it for every obligation up
// front.
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

// Build one obligation's implication given the evaluate-call context:
//   - isInScope(obligation)      → boolean (effective scope, per §3)
//   - obligationsByCategory      → Map<id, category>
//   - obligationApplicabilityDecisions → Map<id, applyTo return>
//   - fulfilmentIdsByObligationId → Map<group id, Set<group fulfilmentId>>
//   - amendedFulfilments         → post-purge fulfilments map
//
// Returns { inScope: false } if the obligation is out of scope. Otherwise
// returns the category-specific implication — see the branches below.
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
    const fulfilmentIds =
      fulfilment && typeof fulfilment === 'object' && !Array.isArray(fulfilment)
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
