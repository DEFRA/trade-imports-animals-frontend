import { collectsOf, isDispatchBuilt } from './dispatch.js'
import { sectionObligationIds } from './section-status.js'
import { pagePrerequisites, sectionPrerequisites } from './prerequisites.js'

const assertDispatchBuilt = () => {
  if (isDispatchBuilt()) return
  throw new Error(
    'Derived gate consulted before the dispatch index exists — call ' +
      'buildDispatch() at boot first (an empty index would silently gate ' +
      'every page and section out)'
  )
}

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
