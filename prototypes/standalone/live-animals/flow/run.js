import { hubPath, pagePath } from '../config.js'
import { importTypeFilterPage } from '../features/import-type-filter/page.js'
import { originPage } from '../features/origin/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { importPurposePage } from '../features/import-purpose/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import { pageGatePasses } from './gates.js'

export const COMMODITY_SELECT_STEP = 'commoditySelect'
export const COMMODITY_DETAILS_STEP = 'commodityDetails'
export const ANIMAL_IDENTIFIERS_STEP = 'animalIdentifiers'

const flowPageTarget = (page) => (scope) =>
  pageGatePasses(page, scope) ? pagePath(page.slug) : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/flow-and-gates.md, "The opening run"). */
export const RUN_STEPS = [
  { id: importTypeFilterPage.id, target: flowPageTarget(importTypeFilterPage) },
  { id: originPage.id, target: flowPageTarget(originPage) },
  {
    id: COMMODITY_SELECT_STEP,
    target: (scope) =>
      pageGatePasses(commoditiesPage, scope)
        ? pagePath('commodities/select')
        : null
  },
  { id: COMMODITY_DETAILS_STEP, target: () => null },
  { id: importReasonPage.id, target: flowPageTarget(importReasonPage) },
  { id: importPurposePage.id, target: flowPageTarget(importPurposePage) },
  {
    id: ANIMAL_IDENTIFIERS_STEP,
    target: (scope) =>
      scope.answered('commodityLines')
        ? pagePath('commodities/0/identifiers')
        : null
  },
  {
    id: additionalDetailsPage.id,
    target: flowPageTarget(additionalDetailsPage)
  }
]

export const nextRunTarget = (stepId, scope) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) return null
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope)
    if (target) return target
  }
  return hubPath()
}
