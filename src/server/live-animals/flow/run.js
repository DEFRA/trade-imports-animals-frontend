import { hubPath, pagePath } from '../config.js'
import { importTypeFilterPage } from '../features/import-type-filter/page.js'
import { originPage } from '../features/origin/page.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { importPurposePage } from '../features/import-purpose/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import { pageGatePasses } from './gates.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/flow-and-gates.md, "The opening run"). The commodity leg is a
 * two-page shape: batch search then the consolidated details page
 * (whose derived gate holds until a line exists). The identification step
 * is a single card-per-species surface, gated like every other
 * flow page (its RULE 1 prerequisite holds it until a line exists). */
export const RUN_STEPS = [
  { id: importTypeFilterPage.id, target: flowPageTarget(importTypeFilterPage) },
  { id: originPage.id, target: flowPageTarget(originPage) },
  { id: commoditiesPage.id, target: flowPageTarget(commoditiesPage) },
  {
    id: consignmentDetailsPage.id,
    target: flowPageTarget(consignmentDetailsPage)
  },
  { id: importReasonPage.id, target: flowPageTarget(importReasonPage) },
  { id: importPurposePage.id, target: flowPageTarget(importPurposePage) },
  {
    id: animalIdentificationPage.id,
    target: flowPageTarget(animalIdentificationPage)
  },
  {
    id: additionalDetailsPage.id,
    target: flowPageTarget(additionalDetailsPage)
  }
]

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) return null
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) return target
  }
  return hubPath(journeyId)
}
