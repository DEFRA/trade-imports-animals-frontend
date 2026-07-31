import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { regionCodeApplies } from '../../applicability.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const importDetailsCard = (journeyId, answers, scope, readOnly) => ({
  title: copy.cards.importDetails,
  rows: [
    row(
      journeyId,
      readOnly,
      copy.rows.countryOfOrigin,
      countries.originLabel(answers.countryOfOrigin) ?? '',
      'countryOfOrigin'
    ),
    row(
      journeyId,
      readOnly,
      copy.rows.regionCodeRequired,
      copy.yesNo[answers.regionOfOriginCodeRequirement] ?? '',
      'regionOfOriginCodeRequirement'
    ),
    ...(regionCodeApplies(answers, scope)
      ? [
          row(
            journeyId,
            readOnly,
            copy.rows.regionCode,
            answers.regionOfOriginCode,
            'regionOfOriginCode'
          )
        ]
      : []),
    row(
      journeyId,
      readOnly,
      copy.rows.internalReference,
      answers.internalReferenceNumber,
      'internalReferenceNumber'
    )
  ]
})
