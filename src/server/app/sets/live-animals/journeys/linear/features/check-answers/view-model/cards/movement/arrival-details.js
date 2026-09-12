import * as countries from '../../../../../../../../../services/countries/index.js'
import * as ports from '../../../../../../../../../services/ports/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import {
  portOfEntryPage,
  transitCountriesPage
} from '../../../../transport/page.js'
import { transitedCountriesApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { dateText, toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

/** The heading's links, gated on the same predicate as the rows they serve. */
const arrivalActions = (journeyId, answers, scope) => ({
  items: [
    ...cardAction(
      journeyId,
      portOfEntryPage.slug,
      copy.hidden.cards.arrivalDetails
    ).items,
    ...(transitedCountriesApplies(answers, scope)
      ? cardAction(
          journeyId,
          transitCountriesPage.slug,
          copy.hidden.cards.transitCountries
        ).items
      : [])
  ]
})

/**
 * The transited countries are collected on their own page, so this card's rows
 * span two — and so does its heading. The first Change link goes to the
 * port-of-entry page, the page the hub's arrival-details task row leads with
 * and the page the other five rows come from. When the transited-countries row
 * stands, the heading carries a second link, to the transit-countries page:
 * incomplete-cards.js marks this card incomplete for a missing
 * transited-countries answer, so a trader who meets that error has to be able
 * to reach the page that collects it.
 */
export const arrivalDetailsCard = (journeyId, answers, scope, readOnly) => ({
  id: 'arrivalDetails',
  title: copy.cards.arrivalDetails,
  ...editableActions(readOnly, arrivalActions(journeyId, answers, scope)),
  rows: [
    row(
      copy.rows.portOfEntry,
      ports.label(answers.portOfEntry) ?? answers.portOfEntry
    ),
    row(copy.rows.arrivalDate, dateText(answers.arrivalDateAtPort)),
    row(copy.rows.meansOfTransport, copy.means[answers.meansOfTransport] ?? ''),
    ...(transitedCountriesApplies(answers, scope)
      ? [
          row(
            copy.rows.transitedCountries,
            toArray(answers.transitedCountries)
              .map((code) => countries.originLabel(code) ?? code)
              .join(', ')
          )
        ]
      : []),
    row(copy.rows.transportIdentification, answers.transportIdentification),
    row(
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference
    )
  ]
})
