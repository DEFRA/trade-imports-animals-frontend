import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { originPage } from '../../../../origin/page.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const originOfImportCard = async ({
  journeyId,
  changeLinkTrail,
  answers,
  readOnly
}) => ({
  id: 'originOfImport',
  title: copy.cards.originOfImport,
  ...editableActions({
    readOnly,
    actions: changeAction(
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
    row(copy.rows.regionCode, answers.regionOfOriginCode),
    row(copy.rows.internalReference, answers.internalReferenceNumber)
  ]
})
