import * as countries from '../../../../../../../../../services/countries/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { originPage } from '../../../../origin/page.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

const REGION_CODE_NEEDED = 'yes'

// The code reads only while the origin page said one was needed; any other
// reading is blank, which the row writes as Not applicable.
const regionCodeText = (answers) =>
  answers.regionOfOriginCodeRequirement === REGION_CODE_NEEDED
    ? answers.regionOfOriginCode
    : null

export const importDetailsCard = async (
  journeyId,
  answers,
  _scope,
  readOnly
) => ({
  id: 'importDetails',
  title: copy.cards.importDetails,
  ...editableActions(
    readOnly,
    changeAction(journeyId, originPage.slug, copy.hidden.cards.importDetails)
  ),
  rows: [
    row(
      copy.rows.countryOfOrigin,
      (await countries.originDisplayLabel(
        answers.countryOfOriginSubdivisionCode || answers.countryOfOrigin
      )) ?? ''
    ),
    row(copy.rows.regionCode, regionCodeText(answers)),
    row(copy.rows.internalReference, answers.internalReferenceNumber)
  ]
})
