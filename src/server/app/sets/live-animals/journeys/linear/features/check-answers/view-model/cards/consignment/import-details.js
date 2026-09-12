import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { originPage } from '../../../../origin/page.js'
import { regionCodeApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const importDetailsCard = (journeyId, answers, scope, readOnly) => ({
  id: 'importDetails',
  title: copy.cards.importDetails,
  ...editableActions(
    readOnly,
    cardAction(journeyId, originPage.slug, copy.hidden.cards.importDetails)
  ),
  rows: [
    row(
      copy.rows.countryOfOrigin,
      countries.originLabel(answers.countryOfOrigin) ?? ''
    ),
    row(
      copy.rows.regionCodeRequired,
      copy.yesNo[answers.regionOfOriginCodeRequirement] ?? ''
    ),
    ...(regionCodeApplies(answers, scope)
      ? [row(copy.rows.regionCode, answers.regionOfOriginCode)]
      : []),
    row(copy.rows.internalReference, answers.internalReferenceNumber)
  ]
})
