import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transitCountriesPage } from '../../../../transport/page.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

export const transitCountriesCard = async (journeyId, answers, readOnly) => {
  const codes = toArray(answers.transitedCountries)
  const labels = await Promise.all(codes.map(countries.countryDisplayLabel))
  return {
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
    rows: [row(copy.rows.transitedCountries, labels.join(', '))]
  }
}
