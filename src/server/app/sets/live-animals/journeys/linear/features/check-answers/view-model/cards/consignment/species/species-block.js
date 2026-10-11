import { consignmentDetailsPage } from '../../../../../commodities/page.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { packagesApply } from '../../../applicability.js'
import { changeAction, editableActions } from '../../../rows/change-link.js'
import { row } from '../../../rows/summary-row.js'
import { identifierTable } from './identifier-table.js'
import { speciesName } from './species-name.js'

const copy = copyFor({ en, cy })

const blockHeading = (entry) =>
  speciesName(entry) || entry.commoditySelection?.trim() || copy.notApplicable

/** One species of a commodity: the animal and package rows, and the identifier
 * table. The first row carries its own Change link to the consignment details
 * page, which collects the numbers. */
export const speciesBlock = (journeyId, entry, units, readOnly) => {
  const heading = blockHeading(entry)
  return {
    heading,
    rows: [
      {
        ...row(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
        ...editableActions(
          readOnly,
          changeAction(
            journeyId,
            consignmentDetailsPage.slug,
            copy.hidden.numberOfAnimalsFor(heading)
          )
        )
      },
      ...(packagesApply(entry.commoditySelection)
        ? [row(copy.rows.numberOfPackages, entry.numberOfPackages)]
        : [])
    ],
    identifierTable: identifierTable(units, entry.commoditySelection)
  }
}
