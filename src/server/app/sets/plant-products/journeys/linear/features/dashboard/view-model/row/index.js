import { randomUUID } from 'node:crypto'

import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../../../../engine/index.js'
import { hubPath, pagePath } from '../../../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as sharedCy } from '../../../../../../../../shared/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../../shared/copy.en.js'
import { countryLabel } from '../../../../../../services/reference/countries.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { formatDisplayDate } from '../../notification-helper.js'
import { statusView } from '../statuses.js'

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const referenceOf = (journey) =>
  journey.referenceNumber ?? journey.reference ?? journey.journeyId ?? ''

const copyAction = (journey, reference, retryCopy) => ({
  text: sharedCopy.notificationActions.copy.text,
  hiddenText: copy.actions.forNotification(reference),
  postAction: pagePath(journey.journeyId, 'copy'),
  idempotencyKey:
    retryCopy?.journeyId === journey.journeyId
      ? retryCopy.idempotencyKey
      : randomUUID(),
  copyOrigin: 'dashboard'
})

const deleteAction = (journey, reference) => ({
  text: sharedCopy.notificationActions.delete.text,
  hiddenText: copy.actions.forNotification(reference),
  href: pagePath(journey.journeyId, 'delete')
})

export const toRow = (journey = {}, retryCopy = null) => {
  const reference = referenceOf(journey)
  const canContinue = journey.status === DRAFT || journey.status === AMEND
  const canCopy = journey.status === SUBMITTED || journey.status === AMEND
  const canDelete = [DRAFT, SUBMITTED, AMEND].includes(journey.status)
  const actions = []

  if (canContinue) {
    actions.push({
      text: copy.actions.continue,
      hiddenText: copy.actions.forNotification(reference),
      href: hubPath(journey.journeyId)
    })
  }
  if (canCopy) actions.push(copyAction(journey, reference, retryCopy))
  if (canDelete) actions.push(deleteAction(journey, reference))

  return {
    reference,
    status: statusView(journey.status, copy),
    origin: journey.originCountryCode
      ? (countryLabel(journey.originCountryCode) ?? journey.originCountryCode)
      : '',
    arrival: formatDisplayDate(journey.arrivalDate),
    created: formatDisplayDate(journey.createdAt),
    submitted: formatDisplayDate(journey.submittedAt),
    actions
  }
}
