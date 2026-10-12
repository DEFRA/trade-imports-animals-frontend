import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { portOfEntryPage } from '../../../../transport/page.js'
import { transitedCountriesApplies } from '../../applicability.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText } from '../../rows/value-text.js'
import { inTemplateMode } from '../../../../../../../../../shared/template-mode.js'
import { transitCountriesSubsection } from './transit-countries.js'

const copy = copyFor({ en, cy })

/**
 * Where and when the consignment lands, and what it arrives on. Every row here
 * comes from the port-of-entry page, so the card carries the one Change link
 * that page needs. The transit countries read inside this card under their own
 * heading, with their own Change link.
 *
 * A template is reused across consignments, so its review shows no arrival date.
 */
export const arrivalDetailsCard = async (
  journeyId,
  answers,
  scope,
  readOnly
) => ({
  id: 'arrivalDetails',
  title: copy.cards.arrivalDetails,
  ...editableActions(
    readOnly,
    changeAction(
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
    ...(inTemplateMode()
      ? []
      : [row(copy.rows.arrivalDate, dateText(answers.arrivalDateAtPort))]),
    row(copy.rows.meansOfTransport, copy.means[answers.meansOfTransport] ?? ''),
    row(copy.rows.transportIdentification, answers.transportIdentification),
    row(
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference
    )
  ],
  subsections: transitedCountriesApplies(answers, scope)
    ? [await transitCountriesSubsection(journeyId, answers, readOnly)]
    : []
})
