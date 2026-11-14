import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip, sharedCopy } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../flow/notification-action-slugs.js'
import { notificationDateText } from '../../review/notification-date.js'
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

const dateSubmittedLine = ({ submittedAt }) =>
  submittedAt
    ? copy.submittedHeader.dateSubmitted(notificationDateText(submittedAt))
    : null

const importReferences = ({ journeyId }) => {
  const customsDocumentCode = 'C640'
  return {
    heading: copy.importReferences.heading,
    warning: {
      text: copy.importReferences.warning,
      iconFallbackText: copy.importReferences.warningIcon
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
 * The header of a submitted notification's view.
 *
 * @param {object} journey - a submitted journey.
 * @returns {object} the reference, the status tag, the date submitted line
 * (null without a stored submission instant), the Amend, Copy as new and
 * Delete actions, and the import reference numbers section.
 */
export const submittedHeader = (journey) => ({
  reference: journey.journeyId,
  status: journeyStrip(journey).status,
  dateSubmitted: dateSubmittedLine(journey),
  actions: {
    amend: {
      text: copy.submittedHeader.amend,
      formAction: pagePath(journey.journeyId, notificationActionSlugs.amend)
    },
    copy: {
      text: sharedCopy.notificationActions.copy.text,
      formAction: pagePath(journey.journeyId, notificationActionSlugs.copy)
    },
    delete: deleteButtonFor(journey)
  },
  importReferences: importReferences(journey)
})
