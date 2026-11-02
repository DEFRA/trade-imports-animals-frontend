import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { originPage } from '../features/origin/page.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import {
  portOfEntryPage,
  transitCountriesPage,
  transportersPage
} from '../features/transport/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { pageGatePasses } from '../../../../../flow/gates.js'
import { identifiesAnAnimal } from './task-rows.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps. A null target skips the step.
 * `backCandidates` lists the earlier steps a step's Back link may open, nearest
 * first. `offersBackWhen` is the answers condition for a step to be a Back
 * destination. */
export const RUN_STEPS = [
  { id: originPage.id, target: flowPageTarget(originPage) },
  {
    id: commoditiesPage.id,
    target: flowPageTarget(commoditiesPage),
    backCandidates: [originPage.id]
  },
  {
    id: importReasonPage.id,
    target: flowPageTarget(importReasonPage),
    backCandidates: [commoditiesPage.id]
  },
  {
    id: consignmentDetailsPage.id,
    target: flowPageTarget(consignmentDetailsPage),
    backCandidates: [commoditiesPage.id]
  },
  {
    id: animalIdentificationPage.id,
    target: flowPageTarget(animalIdentificationPage),
    offersBackWhen: identifiesAnAnimal
  },
  {
    id: additionalDetailsPage.id,
    target: flowPageTarget(additionalDetailsPage),
    backCandidates: [animalIdentificationPage.id, consignmentDetailsPage.id]
  },
  { id: portOfEntryPage.id, target: flowPageTarget(portOfEntryPage) },
  {
    id: transitCountriesPage.id,
    target: flowPageTarget(transitCountriesPage),
    backCandidates: [portOfEntryPage.id]
  },
  { id: transportersPage.id, target: flowPageTarget(transportersPage) },
  { id: documentsPage.id, target: flowPageTarget(documentsPage) },
  {
    id: addressesPage.id,
    target: flowPageTarget(addressesPage),
    endsRunWhenComplete: true
  },
  {
    id: consignmentContactSelectPage.id,
    target: flowPageTarget(consignmentContactSelectPage)
  },
  { id: notificationViewPage.id, target: flowPageTarget(notificationViewPage) }
]

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) {
    return null
  }
  if (RUN_STEPS[index].endsRunWhenComplete && scope.readyForCheckYourAnswers) {
    return hubPath(journeyId)
  }
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return hubPath(journeyId)
}

const backDestinationTarget = (candidateId, { scope, answers }, journeyId) => {
  const candidate = RUN_STEPS.find((step) => step.id === candidateId)
  return (candidate.offersBackWhen?.(answers) ?? true)
    ? candidate.target(scope, journeyId)
    : null
}

export const previousRunTarget = (stepId, { scope, answers }, journeyId) => {
  const candidateIds =
    RUN_STEPS.find((step) => step.id === stepId)?.backCandidates ?? []
  for (const candidateId of candidateIds) {
    const target = backDestinationTarget(
      candidateId,
      { scope, answers },
      journeyId
    )
    if (target) {
      return target
    }
  }
  return null
}
