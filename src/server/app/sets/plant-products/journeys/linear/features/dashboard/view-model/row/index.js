import { AMEND, DRAFT } from '../../../../../../../../engine/index.js'
import { hubPath } from '../../../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { countryLabel } from '../../../../../../services/reference/countries.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { formatDisplayDate } from '../../notification-helper.js'
import { statusView } from '../statuses.js'

const copy = copyFor({ en, cy })

const referenceOf = (journey) =>
  journey.referenceNumber ?? journey.reference ?? journey.journeyId ?? ''

export const toRow = (journey = {}) => {
  const reference = referenceOf(journey)
  const canContinue = journey.status === DRAFT || journey.status === AMEND

  return {
    reference,
    status: statusView(journey.status, copy),
    origin: journey.originCountryCode
      ? (countryLabel(journey.originCountryCode) ?? journey.originCountryCode)
      : '',
    arrival: formatDisplayDate(journey.arrivalDate),
    created: formatDisplayDate(journey.createdAt),
    submitted: formatDisplayDate(journey.submittedAt),
    actions: canContinue
      ? [
          {
            text: copy.actions.continue,
            hiddenText: copy.actions.forNotification(reference),
            href: hubPath(journey.journeyId)
          }
        ]
      : []
  }
}
