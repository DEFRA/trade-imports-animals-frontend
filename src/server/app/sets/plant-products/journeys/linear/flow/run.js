// Scaffolded by docs/add-a-set.md step 3.
import { pageGatePasses } from '../../../../../flow/gates.js'
import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { importTypePage } from '../features/import-type/page.js'
import {
  countryOfOriginPage,
  originOfImportPage
} from '../features/origin/page.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

export const RUN_STEPS = [
  { id: importTypePage.id, target: flowPageTarget(importTypePage) },
  { id: countryOfOriginPage.id, target: flowPageTarget(countryOfOriginPage) },
  { id: originOfImportPage.id, target: flowPageTarget(originOfImportPage) }
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
