import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { linesOf } from '../../../../commodities/lines.js'
import { commoditiesPage } from '../../../../commodities/page.js'
import { speciesTitleName } from '../../../../commodities/species-label.js'
import { buildSelectedCommodityRows } from '../../../../commodities/view-model/selected-commodity-rows.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'

const copy = copyFor({ en, cy })

const commaSeparated = (values) => values.filter(Boolean).join(', ')

export const whatAreYouImportingCard = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) => {
  const selected = buildSelectedCommodityRows(linesOf(answers, evaluation))
  const entries = selected.flatMap(({ lines }) =>
    lines.map(({ entry }) => entry)
  )
  return {
    id: 'whatAreYouImporting',
    title: copy.cards.whatAreYouImporting,
    ...editableActions({
      readOnly,
      actions: changeAction(
        { journeyId, changeLinkTrail },
        commoditiesPage.slug,
        copy.hidden.cards.whatAreYouImporting
      )
    }),
    rows: [
      row(
        copy.rows.commodityCode,
        commaSeparated(selected.map(({ code }) => code))
      ),
      row(
        copy.rows.speciesCommonName,
        commaSeparated(entries.map((entry) => entry.speciesCommonName))
      ),
      row(copy.rows.species, commaSeparated(entries.map(speciesTitleName)))
    ]
  }
}
