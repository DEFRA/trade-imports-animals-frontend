import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { portOfEntryPage } from '../../../../transport/page.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

/**
 * Where and when the consignment lands, and what it arrives on. Every row here
 * comes from the port-of-entry page, so the card carries the one Change link
 * that page needs. The countries the consignment travels through used to be a
 * row here, reached from a second link; design release 1 gives them their own
 * card, which now carries the link to the page that collects them.
 */
export const arrivalDetailsCard = (journeyId, answers, readOnly) => ({
  id: 'arrivalDetails',
  title: copy.cards.arrivalDetails,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      portOfEntryPage.slug,
      copy.hidden.cards.arrivalDetails
    )
  ),
  rows: [
    row(
      copy.rows.portOfEntry,
      ports.label(answers.portOfEntry) ?? answers.portOfEntry
    ),
    row(copy.rows.arrivalDate, dateText(answers.arrivalDateAtPort)),
    row(copy.rows.meansOfTransport, copy.means[answers.meansOfTransport] ?? ''),
    row(copy.rows.transportIdentification, answers.transportIdentification),
    row(
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference
    )
  ]
})
