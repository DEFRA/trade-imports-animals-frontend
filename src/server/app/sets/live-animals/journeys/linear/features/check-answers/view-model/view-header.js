import { DRAFT, SUBMITTED } from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip, sharedCopy } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../flow/notification-action-slugs.js'
import { formatMomentAsLongDay } from '../../../../../../../lib/validate/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/**
 * The Delete notification button of a journey's review.
 *
 * @param {object} journey - the journey being reviewed.
 * @returns {object} the button's text, delete page and warning style.
 */
export const deleteButtonFor = (journey) => ({
  text: sharedCopy.notificationActions.delete.text,
  href: pagePath(journey.journeyId, notificationActionSlugs.delete),
  classes: 'govuk-button--warning'
})

const dateLine = (journey) => {
  const { datedLineFor, instant } =
    journey.status === SUBMITTED
      ? {
          datedLineFor: copy.viewHeader.dateSubmitted,
          instant: journey.submittedAt
        }
      : {
          datedLineFor: copy.viewHeader.dateCreated,
          instant: journey.createdAt
        }
  return instant ? datedLineFor(formatMomentAsLongDay(new Date(instant))) : null
}

const amendAction = (journey) =>
  journey.status === SUBMITTED
    ? {
        text: copy.viewHeader.amend,
        postAction: pagePath(journey.journeyId, notificationActionSlugs.amend)
      }
    : null

const copyAction = (journey, { besideAmend }) => ({
  text: sharedCopy.notificationActions.copy.text,
  postAction: pagePath(journey.journeyId, notificationActionSlugs.copy),
  classes: besideAmend ? 'govuk-button--secondary' : ''
})

const importReferences = ({ journeyId }) => {
  const customsDocumentCode = 'C640'
  return {
    heading: copy.importReferences.heading,
    warning: {
      text: copy.importReferences.warning,
      iconFallbackText: copy.warningIcon
    },
    rows: [
      {
        key: { text: copy.importReferences.notificationReference },
        value: { text: journeyId }
      },
      {
        key: { text: copy.importReferences.customsDocumentCode },
        value: { text: customsDocumentCode }
      }
    ]
  }
}

/**
 * The header of a notification's view, for a draft and for a submitted
 * notification.
 *
 * @param {object} journey - the journey being viewed.
 * @returns {object|null} null unless the journey is a draft or submitted;
 * otherwise { reference, status, dateLine, actions: { amend, copy, delete },
 * importReferences }
 *
 * dateLine is 'Date created' for a draft and 'Date submitted' for a submitted notification, and null without the stored instant.
 */
export const viewHeader = (journey) => {
  if (journey.status !== DRAFT && journey.status !== SUBMITTED) {
    return null
  }
  const amend = amendAction(journey)
  return {
    reference: journey.journeyId,
    status: journeyStrip(journey).status,
    dateLine: dateLine(journey),
    actions: {
      amend,
      copy: copyAction(journey, { besideAmend: amend !== null }),
      delete: deleteButtonFor(journey)
    },
    importReferences: importReferences(journey)
  }
}
