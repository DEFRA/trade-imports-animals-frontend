import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transitCountriesPage } from '../../../../transport/page.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

/**
 * The countries the consignment travels through, collected on their own page
 * and asked for only when the means of transport is overland. They read inside
 * the Arrival details card under their own heading, with a Change link on the
 * row; the card builder makes the call on whether they apply.
 */
export const transitCountriesSubsection = async (
  journeyId,
  answers,
  readOnly
) => {
  const codes = toArray(answers.transitedCountries)
  const labels = await Promise.all(
    codes.map(
      async (code) => (await countries.originDisplayLabel(code)) ?? code
    )
  )
  return {
    heading: copy.subsections.transitCountries,
    rows: [
      {
        ...row(copy.rows.transitedCountries, labels.join(', ')),
        ...editableActions(
          readOnly,
          changeAction(
            journeyId,
            transitCountriesPage.slug,
            copy.hidden.rows.transitedCountries
          )
        )
      }
    ]
  }
}
