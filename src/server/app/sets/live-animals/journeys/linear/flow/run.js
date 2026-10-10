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

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/flow-and-gates.md, "The opening run"). The run is the whole
 * notification: "Save and continue" carries a new notification from the origin
 * page through to the review page in one pass. The reason for import is asked
 * straight after what is being imported and before the commodity details.
 *
 * The CPH number page is not a step: it is reached only from its row on the
 * addresses page. The addresses step ends the run on the hub when nothing is
 * outstanding. Otherwise the run ends on the review page, which names what is
 * outstanding, whenever a commodity has been chosen. The transporter leg is
 * one step, the list; the add spokes behind it hand the run back at the
 * list's step when they save. */
export const RUN_STEPS = [
  { id: originPage.id, target: flowPageTarget(originPage) },
  { id: commoditiesPage.id, target: flowPageTarget(commoditiesPage) },
  { id: importReasonPage.id, target: flowPageTarget(importReasonPage) },
  {
    id: consignmentDetailsPage.id,
    target: flowPageTarget(consignmentDetailsPage)
  },
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

/** The page each step's Back link names while the opening run is under way, as
 * Design Release 2.1 orders them. Commodity details names the commodity page,
 * not the reason for import between them. A step left out keeps the overview. */
const RUN_BACK_STEPS = Object.freeze({
  [commoditiesPage.id]: originPage,
  [consignmentDetailsPage.id]: commoditiesPage
})

export const runBackTarget = (pageId, journeyId) =>
  Object.hasOwn(RUN_BACK_STEPS, pageId)
    ? pagePath(journeyId, RUN_BACK_STEPS[pageId].slug)
    : null

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
