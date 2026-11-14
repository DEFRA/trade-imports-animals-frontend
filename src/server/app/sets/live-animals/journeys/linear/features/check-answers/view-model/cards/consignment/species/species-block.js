import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import {
  animalIdentificationPage,
  consignmentDetailsPage
} from '../../../../../commodities/page.js'
import { speciesTitleName } from '../../../../../commodities/species-label.js'
import { packagesApply } from '../../../applicability.js'
import { changeAction, editableActions } from '../../../rows/change-link.js'
import { row } from '../../../rows/summary-row.js'
import { speciesBlockAnchor } from '../../../species-errors.js'
import { identificationDetailsTable } from './identification-details-table.js'
import { unitsForCommodityLine } from './units-for-commodity-line.js'

const copy = copyFor({ en, cy })

const identificationDetails = ({
  changeContext,
  readOnly,
  speciesName,
  entry,
  units
}) => {
  const table = identificationDetailsTable(
    units,
    entry.commodityCode,
    entry.speciesLatinName
  )
  return table
    ? {
        ...editableActions({
          readOnly,
          actions: changeAction(
            changeContext,
            animalIdentificationPage.slug,
            copy.hidden.identificationDetails(speciesName)
          )
        }),
        table
      }
    : null
}

const speciesRows = ({ changeContext, readOnly, speciesName, entry }) => [
  {
    ...row(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
    ...editableActions({
      readOnly,
      actions: changeAction(
        changeContext,
        consignmentDetailsPage.slug,
        copy.hidden.numberOfAnimals(speciesName)
      )
    })
  },
  ...(packagesApply(entry.commodityCode)
    ? [row(copy.rows.numberOfPackages, entry.numberOfPackages)]
    : [])
]

export const speciesBlock = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly,
  line: { index, entry }
}) => {
  const changeContext = { journeyId, changeLinkTrail }
  const speciesName = speciesTitleName(entry)
  return {
    anchor: speciesBlockAnchor(index),
    heading: speciesName,
    rows: speciesRows({ changeContext, readOnly, speciesName, entry }),
    identificationDetails: identificationDetails({
      changeContext,
      readOnly,
      speciesName,
      entry,
      units: unitsForCommodityLine(answers, evaluation, index)
    })
  }
}
