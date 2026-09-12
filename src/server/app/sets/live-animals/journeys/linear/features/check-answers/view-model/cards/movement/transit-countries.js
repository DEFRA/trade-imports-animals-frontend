import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transitCountriesPage } from '../../../../transport/page.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

/**
 * The countries the consignment travels through, collected on their own page
 * and asked for only when the means of transport is overland. Design release 1
 * gives them their own card under their own heading, so the card stands only
 * while the answer is in scope — the section builder makes that call.
 */
export const transitCountriesCard = (journeyId, answers, readOnly) => ({
  id: 'transitCountries',
  title: copy.cards.transitCountries,
  ...editableActions(
    readOnly,
    cardAction(
      journeyId,
      transitCountriesPage.slug,
      copy.hidden.cards.transitCountries
    )
  ),
  rows: [
    row(
      copy.rows.transitedCountries,
      toArray(answers.transitedCountries)
        .map((code) => countries.originLabel(code) ?? code)
        .join(', ')
    )
  ]
})
