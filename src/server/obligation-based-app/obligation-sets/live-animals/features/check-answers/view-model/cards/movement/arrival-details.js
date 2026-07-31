import * as countries from '../../../../../services/countries/index.js'
import * as ports from '../../../../../services/ports/index.js'
import { copyFor } from '../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { transitedCountriesApplies } from '../../applicability.js'
import { row } from '../../rows/summary-row.js'
import { dateText, toArray } from '../../rows/value-text.js'

const copy = copyFor({ en, cy })

export const arrivalDetailsCard = (journeyId, answers, scope, readOnly) => ({
  title: copy.cards.arrivalDetails,
  rows: [
    row(
      journeyId,
      readOnly,
      copy.rows.portOfEntry,
      ports.label(answers.portOfEntry) ?? answers.portOfEntry,
      'portOfEntry'
    ),
    row(
      journeyId,
      readOnly,
      copy.rows.arrivalDate,
      dateText(answers.arrivalDateAtPort),
      'arrivalDateAtPort'
    ),
    row(
      journeyId,
      readOnly,
      copy.rows.meansOfTransport,
      copy.means[answers.meansOfTransport] ?? '',
      'meansOfTransport'
    ),
    ...(transitedCountriesApplies(answers, scope)
      ? [
          row(
            journeyId,
            readOnly,
            copy.rows.transitedCountries,
            toArray(answers.transitedCountries)
              .map((code) => countries.originLabel(code) ?? code)
              .join(', '),
            'transitedCountries'
          )
        ]
      : []),
    row(
      journeyId,
      readOnly,
      copy.rows.transportIdentification,
      answers.transportIdentification,
      'transportIdentification'
    ),
    row(
      journeyId,
      readOnly,
      copy.rows.transportDocumentReference,
      answers.transportDocumentReference,
      'transportDocumentReference'
    )
  ]
})
