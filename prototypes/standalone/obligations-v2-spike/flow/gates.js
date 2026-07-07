import { collectsOf, isDispatchBuilt } from './dispatch.js'
import { sectionObligationIds } from './section-status.js'

/**
 * Gate evaluation — the derived-default / authored-override seam.
 *
 * A `gate` is a pure `(scope) => boolean` deciding whether a page or section
 * is reachable in the sequence. Four of the five gates the flow used to
 * author were bare `inScope.has('<key>')` restatements of the obligation
 * model, coupled to it by a raw string. The default is now DERIVED from the
 * same source the status roll-up reads — the boot-built dispatch index of
 * each page's `collects` — so "gate passes ⟺ section status is not
 * Not Applicable" holds by construction rather than by discipline. An
 * authored `gate` remains the OVERRIDE for flow-level facts the model cannot
 * express; the only one today is `get-your-quote`'s readiness roll-up.
 *
 * Empty-`collects` convention: a step that collects nothing (the system-only
 * quote-summary page) derives to reachable — restricting such a step is
 * exactly what an authored gate is for.
 *
 * FAIL LOUD before boot: `collectsOf` legitimately answers `[]` for a page
 * that collects nothing, so an unbuilt index is indistinguishable from
 * "nothing collected" and a derived gate consulted before `buildDispatch()`
 * would silently gate every step out. Mirroring `configureReadyForQuote`'s
 * unconfigured default (engine/read.js), the derivation refuses to answer
 * until the index exists.
 */
const assertDispatchBuilt = () => {
  if (isDispatchBuilt()) return
  throw new Error(
    'Derived gate consulted before the dispatch index exists — call ' +
      'buildDispatch() at boot first (an empty index would silently gate ' +
      'every page and section out)'
  )
}

/** Derived default: reachable when some collected obligation is owed
 * (in scope), or when the step collects nothing at all. */
const derivedGate = (obligationIds, scope) =>
  obligationIds.length === 0 ||
  obligationIds.some((id) => scope.inScope.has(id))

export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return derivedGate(collectsOf(page.id), scope)
}

export const sectionGatePasses = (section, scope) => {
  if (section.gate) return section.gate(scope)
  assertDispatchBuilt()
  return derivedGate(sectionObligationIds(section), scope)
}
