import { collectsOf, isDispatchBuilt } from './dispatch.js'
import { sectionObligationIds } from './section-status.js'
import { pagePrerequisites, sectionPrerequisites } from './prerequisites.js'

// FAIL LOUD before boot: `collectsOf` legitimately answers `[]` for a page
// that collects nothing, so an unbuilt index is indistinguishable from
// "nothing collected" — without this throw a derived gate consulted before
// `buildDispatch()` would silently gate every step out.
const assertDispatchBuilt = () => {
  if (isDispatchBuilt()) return
  throw new Error(
    'Derived gate consulted before the dispatch index exists — call ' +
      'buildDispatch() at boot first (an empty index would silently gate ' +
      'every page and section out)'
  )
}

// A derived gate has two clauses, both of which must hold:
// - RULE 1 prerequisites: every `enforcedAt: 'continue'` obligation owned by a
//   strictly-earlier flow step is answered (`scope.answered`, instance-aware).
// - In-scope reachability: a step that collects nothing derives to reachable
//   (restricting such a step is what an authored gate is for); otherwise it is
//   reachable exactly when some obligation it collects is in scope.
const prerequisitesMet = (prereqIds, scope) =>
  prereqIds.every((id) => scope.answered(id))

const inScopeReachable = (obligationIds, scope) =>
  obligationIds.length === 0 ||
  obligationIds.some((id) => scope.inScope.has(id))

export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return (
    prerequisitesMet(pagePrerequisites(page.id), scope) &&
    inScopeReachable(collectsOf(page.id), scope)
  )
}

export const sectionGatePasses = (section, scope) => {
  if (section.gate) return section.gate(scope)
  assertDispatchBuilt()
  return (
    prerequisitesMet(sectionPrerequisites(section), scope) &&
    inScopeReachable(sectionObligationIds(section), scope)
  )
}
