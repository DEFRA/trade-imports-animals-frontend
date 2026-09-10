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
import { cphNumberPage } from '../features/cph-number/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { pageGatePasses } from '../../../../../flow/gates.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The review page ends the run rather than asking a question in it, so it
 * carries the same authored gate the review flow section does: it opens once
 * every task row is ready. A run that arrives with the notification still
 * incomplete falls through to the hub instead. */
const reviewTarget = (scope, journeyId) =>
  scope.readyForCheckYourAnswers
    ? pagePath(journeyId, notificationViewPage.slug)
    : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/flow-and-gates.md, "The opening run"). The run is the whole
 * notification, not a first leg of it: "Save and continue" carries a new
 * notification from the origin page through to the review page in one pass,
 * and the hub is somewhere the user chooses to go through the secondary
 * "Save and return to overview" button.
 *
 * The commodity leg is a two-page shape: batch search then the consolidated
 * details page (whose derived gate holds until a line exists). The
 * identification step is a single card-per-species surface, gated like every
 * other flow page (its RULE 1 prerequisite holds it until a line exists). The
 * transporter leg is one step, the list; the add spokes behind it are a
 * detour, and they hand the run back at the list's step when they save. The
 * addresses leg lists both of its pages; each one's derived gate decides on
 * its own whether the run stops there, so the run does not need to know which
 * of them this notification needs. */
export const RUN_STEPS = [
  { id: originPage.id, target: flowPageTarget(originPage) },
  { id: commoditiesPage.id, target: flowPageTarget(commoditiesPage) },
  {
    id: consignmentDetailsPage.id,
    target: flowPageTarget(consignmentDetailsPage)
  },
  { id: importReasonPage.id, target: flowPageTarget(importReasonPage) },
  {
    id: animalIdentificationPage.id,
    target: flowPageTarget(animalIdentificationPage)
  },
  {
    id: additionalDetailsPage.id,
    target: flowPageTarget(additionalDetailsPage)
  },
  { id: portOfEntryPage.id, target: flowPageTarget(portOfEntryPage) },
  { id: transitCountriesPage.id, target: flowPageTarget(transitCountriesPage) },
  { id: transportersPage.id, target: flowPageTarget(transportersPage) },
  { id: documentsPage.id, target: flowPageTarget(documentsPage) },
  { id: addressesPage.id, target: flowPageTarget(addressesPage) },
  { id: cphNumberPage.id, target: flowPageTarget(cphNumberPage) },
  {
    id: consignmentContactSelectPage.id,
    target: flowPageTarget(consignmentContactSelectPage)
  },
  { id: notificationViewPage.id, target: reviewTarget }
]

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) {
    return null
  }
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return hubPath(journeyId)
}
