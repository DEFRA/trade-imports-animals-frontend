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

  // Immediate children per obligation, from `within` back-refs.
  const obligationChildren = new Map()
  for (const o of obligations) {
    if (o.within) {
      const children = obligationChildren.get(o.within.id) ?? []
      children.push(o)
      obligationChildren.set(o.within.id, children)
    }
  }

  // Classify each obligation into one of the five categories from
  // obligations.js's block comment.
  //   'derived-leaf' — indexedBy.source === 'derived' (id set from applyTo)
  //   'user-leaf'    — indexedBy present, non-derived source (ids from own storage)
  //   'field'        — has `status`, no `applyTo`, no `indexedBy`
  //   'group'        — has children via `within` back-refs, no `status`/`indexedBy`
  //   'single'       — otherwise (leaf value at fulfilments[o.id])
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

  return {
    evaluate(fulfilments) {
      // 1. Drop unknown obligation ids.
      const recognisedFulfilments = {}
      for (const [obligationId, fulfilment] of Object.entries(fulfilments)) {
        if (obligationsById.has(obligationId)) {
          recognisedFulfilments[obligationId] = fulfilment
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
      for (const [obligationId, fulfilment] of Object.entries(
        recognisedFulfilments
      )) {
        const obligation = obligationsById.get(obligationId)
        if (!isInScope(obligation)) continue

        const category = obligationsByCategory.get(obligation.id)

        if (category === 'derived-leaf') {
          const fulfilmentIds = new Set(
            obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
          )
          const filtered = {}
          for (const [fulfilmentId, recordValue] of Object.entries(
            fulfilment ?? {}
          )) {
            const segments = splitPath(fulfilmentId)
            const innermost = segments[segments.length - 1]
            if (fulfilmentIds.has(innermost)) {
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
      const implicationsByObligation = {}
      for (const o of obligations) {
        implicationsByObligation[o.id] = buildImplication(o)
      }

      function buildImplication(obligation) {
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
            fulfilment &&
            typeof fulfilment === 'object' &&
            !Array.isArray(fulfilment)
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

      return {
        fulfilments: amendedFulfilments,
        obligations: implicationsByObligation
      }
    }
  }
}
