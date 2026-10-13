import * as commodities from '../../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { commoditiesPage } from '../../../../commodities/page.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { row } from '../../rows/summary-row.js'
import { toArray } from '../../rows/value-text.js'
import { speciesName } from './species/species-name.js'

const copy = copyFor({ en, cy })

const codeOf = (line) => commodities.commodityCodeFor(line.commoditySelection)

const nameOf = (line) => line.commoditySelection

const individualNameOf = (line) =>
  commodities.speciesCommonName(line.commoditySelection, line.speciesSelection)

/** Reads each commodity once, except one whose species are listed
 * individually, where every line adds its own. */
const readBackOnce = (lines, perIndividual, perCommodity) => {
  const seen = new Set()
  return lines
    .flatMap((line) => {
      if (commodities.speciesListedIndividually(line.commoditySelection)) {
        return [perIndividual(line)]
      }
      if (seen.has(line.commoditySelection)) {
        return []
      }
      seen.add(line.commoditySelection)
      return [perCommodity(line)]
    })
    .filter(Boolean)
    .join(', ')
}

const commodityCodes = (lines) => readBackOnce(lines, codeOf, codeOf)

const commonNames = (lines) => readBackOnce(lines, individualNameOf, nameOf)

const speciesNames = (lines) =>
  lines.map(speciesName).filter(Boolean).join(', ')

export const whatAreYouImportingCard = (journeyId, answers, readOnly) => {
  const lines = toArray(answers.commodityLines).filter(
    (line) => line?.commoditySelection
  )
  return {
    id: 'whatAreYouImporting',
    title: copy.cards.whatAreYouImporting,
    ...editableActions(
      readOnly,
      changeAction(
        journeyId,
        commoditiesPage.slug,
        copy.hidden.cards.whatAreYouImporting
      )
    ),
    rows: [
      row(copy.rows.commodityCode, commodityCodes(lines)),
      row(copy.rows.commonName, commonNames(lines)),
      row(copy.rows.species, speciesNames(lines))
    ]
  }
}
