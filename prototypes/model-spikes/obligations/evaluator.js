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
 *        - Derived indexed leaf → keep only keys whose innermost segment
 *          is in the `applyTo`-returned record id set.
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
  const obligationsById = new Map(obligations.map((o) => [o.id, o]))
  const distinctObligationIds = new Set(obligationsById.keys())

  // Parent-child links from `within` back-refs.
  const parentChildObligations = new Map()
  for (const o of obligations) {
    if (o.within) {
      const kids = parentChildObligations.get(o.within.id) ?? []
      kids.push(o)
      parentChildObligations.set(o.within.id, kids)
    }
  }

  // Classify each obligation.
  //   'indexed' — has `indexedBy` (leaf with own inner dimension)
  //   'field'   — has `status`, no `applyTo`, no `indexedBy`
  //   'group'   — has children via `within` back-refs, no `status`/`indexedBy`
  //   'single'  — otherwise (leaf value at fulfilments[o.id])
  const obligationsByKind = new Map()
  for (const o of obligations) {
    if (o.indexedBy) obligationsByKind.set(o.id, 'indexed')
    else if (o.status !== undefined && !o.applyTo) {
      obligationsByKind.set(o.id, 'field')
    } else if (parentChildObligations.has(o.id)) {
      obligationsByKind.set(o.id, 'group')
    } else obligationsByKind.set(o.id, 'single')
  }

  // Ancestor groups from root down to immediate parent (excluding self).
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

  // Transitive descendants (excluding self).
  const obligationDescendants = new Map()
  for (const o of obligations) {
    const acc = []
    const stack = [...(parentChildObligations.get(o.id) ?? [])]
    while (stack.length) {
      const child = stack.pop()
      acc.push(child)
      for (const grandchild of parentChildObligations.get(child.id) ?? []) {
        stack.push(grandchild)
      }
    }
    obligationDescendants.set(o.id, acc)
  }

  return {
    evaluate(fulfilments) {
      // 1. Drop unknown obligation ids.
      const recognisedFulfilments = {}
      for (const [obligationId, value] of Object.entries(fulfilments)) {
        if (distinctObligationIds.has(obligationId)) {
          recognisedFulfilments[obligationId] = value
        }
      }

      // 2. Run each obligation's applyTo (if it has one).
      const obligationApplicabilityDecisions = new Map()
      for (const o of obligations) {
        if (o.applyTo) {
          obligationApplicabilityDecisions.set(
            o.id,
            o.applyTo(recognisedFulfilments)
          )
        }
      }

      // 3. Effective inScope — own applyTo AND every ancestor group.
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
      for (const o of obligations) isInScope(o)

      // 4. Purge storage.
      const amendedFulfilments = {}
      for (const [obligationId, value] of Object.entries(
        recognisedFulfilments
      )) {
        const obligation = obligationsById.get(obligationId)
        if (!isInScope(obligation)) continue

        const obligationKind = obligationsByKind.get(obligation.id)

        if (
          obligationKind === 'indexed' &&
          obligation.indexedBy?.source === 'derived'
        ) {
          const derivedIds = new Set(
            obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
          )
          const filtered = {}
          for (const [key, v] of Object.entries(value ?? {})) {
            const segments = splitPath(key)
            const innermost = segments[segments.length - 1]
            if (derivedIds.has(innermost)) filtered[key] = v
          }
          if (Object.keys(filtered).length > 0) {
            amendedFulfilments[obligationId] = filtered
          }
        } else if (obligationKind === 'single') {
          amendedFulfilments[obligationId] = value
        } else {
          // field record or user-driven indexed leaf: keep as-is.
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (Object.keys(value).length > 0) {
              amendedFulfilments[obligationId] = value
            }
          } else {
            amendedFulfilments[obligationId] = value
          }
        }
      }

      // 5. Enumerate each group's instance ids from descendants' storage.
      const fulfilmentIdsByObligationId = new Map()
      for (const o of obligations) {
        if (obligationsByKind.get(o.id) !== 'group') continue
        if (!isInScope(o)) {
          fulfilmentIdsByObligationId.set(o.id, new Set())
          continue
        }
        const prefixLen = obligationAncestorGroups.get(o.id).length + 1
        const ids = new Set()
        for (const desc of obligationDescendants.get(o.id)) {
          const storage = amendedFulfilments[desc.id]
          if (!storage || typeof storage !== 'object') continue
          if (Array.isArray(storage)) continue
          for (const key of Object.keys(storage)) {
            const segments = splitPath(key)
            if (segments.length >= prefixLen) {
              ids.add(joinPath(segments.slice(0, prefixLen)))
            }
          }
        }
        fulfilmentIdsByObligationId.set(o.id, ids)
      }

      // 6. Build implications.
      const implicationsByObligation = {}
      for (const o of obligations) {
        implicationsByObligation[o.id] = buildImplication(o)
      }

      function buildImplication(obligation) {
        if (!isInScope(obligation)) return { inScope: false }

        const kind = obligationsByKind.get(obligation.id)
        const own = obligationApplicabilityDecisions.get(obligation.id)

        if (kind === 'single') {
          return own ?? { inScope: true }
        }

        if (kind === 'group') {
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

        if (kind === 'field') {
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

        if (kind === 'indexed') {
          const impl = { inScope: true }
          if (own?.reasons) impl.reasons = own.reasons

          // Derived indexed leaves: the id set comes from applyTo (the
          // authoritative "what instances CAN exist"). Storage tracks
          // which ones have VALUES.
          // User-driven leaves: presence via storage keys.
          if (obligation.indexedBy?.source === 'derived') {
            const ids = own?.records ?? []
            impl.records = ids.map((fulfilmentId) => ({
              fulfilmentId,
              status: obligation.status
            }))
          } else {
            const storage = amendedFulfilments[obligation.id]
            const keys =
              storage && typeof storage === 'object' && !Array.isArray(storage)
                ? Object.keys(storage)
                : []
            impl.records = keys.map((fulfilmentId) => ({
              fulfilmentId,
              status: obligation.status
            }))
          }
          return impl
        }

        return { inScope: true }
      }

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}
