import { formatMomentAsLongDay } from '../../../../../../../lib/validate/index.js'
import {
  OUTSTANDING_HEALTH_CERTIFICATE,
  SUBMITTED_ACTION_REQUIRED,
  isSubmittedStatus
} from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// The customs document code a live-animals import declaration quotes (CHED-A), fixed.
const CUSTOMS_DOCUMENT_CODE = 'C640'

const submittedDateText = (submittedAt) =>
  submittedAt
    ? copy.viewHeader.dateSubmitted(
        formatMomentAsLongDay(new Date(submittedAt))
      )
    : null

const actionsOf = (journey) => {
  const id = journey.journeyId
  const amendHref = isSubmittedStatus(journey.status)
    ? pagePath(id, 'amend')
    : null
  return {
    amendHref,
    copyHref: pagePath(id, 'copy'),
    copyIsPrimary: amendHref === null,
    deleteHref: pagePath(id, 'delete')
  }
}

const isActionRequired = (journey) =>
  journey.status === SUBMITTED_ACTION_REQUIRED

const onlyHealthCertificateOutstanding = ({ outstandingItems = [] }) =>
  outstandingItems.length === 1 &&
  outstandingItems[0] === OUTSTANDING_HEALTH_CERTIFICATE

const importReferencesOf = (journey) => [
  {
    key: { text: copy.importReferences.notificationReference },
    value: { text: journey.journeyId }
  },
  {
    key: { text: copy.importReferences.customsDocumentCode },
    value: { text: CUSTOMS_DOCUMENT_CODE }
  }
]

/** The header of a submitted notification's view: its reference, status and
 * date submitted, the actions it offers and the import reference numbers, and,
 * when action is required, its warning and the Continue that starts an
 * amendment.
 * @param {object} journey
 * @returns {object}
 */
export const viewHeaderOf = (journey) => ({
  reference: journey.journeyId,
  status: journeyStrip(journey).status,
  dateSubmitted: submittedDateText(journey.submittedAt),
  warning:
    isActionRequired(journey) && onlyHealthCertificateOutstanding(journey)
      ? copy.viewHeader.healthCertificateWarning
      : null,
  continueHref: isActionRequired(journey)
    ? pagePath(journey.journeyId, 'amend')
    : null,
  actions: actionsOf(journey),
  importReferences: importReferencesOf(journey)
})
