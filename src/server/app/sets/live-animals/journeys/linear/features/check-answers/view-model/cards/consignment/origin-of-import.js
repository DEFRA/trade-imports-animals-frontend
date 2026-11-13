import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { originPage } from '../../../../origin/page.js'
import { regionCodeApplies } from '../../applicability.js'
import { cardAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const originOfImportCard = async ({
  journeyId,
  changeLinkTrail,
  answers,
  scope,
  readOnly
}) => ({
  id: 'originOfImport',
  title: copy.cards.originOfImport,
  ...editableActions({
    readOnly,
    actions: cardAction(
      { journeyId, changeLinkTrail },
      originPage.slug,
      copy.hidden.cards.originOfImport
    )
  }),
  rows: [
    row(
      copy.rows.countryOfOrigin,
      (await countries.countryDisplayLabel(
        answers.countryOfOriginSubdivisionCode || answers.countryOfOrigin
      )) ?? ''
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
