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
 * Where and when the consignment lands, and what it arrives on.
 */
export const arrivalDetailsCard = async (journeyId, answers, readOnly) => ({
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
      (await ports.label(answers.portOfEntry)) ?? answers.portOfEntry
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
