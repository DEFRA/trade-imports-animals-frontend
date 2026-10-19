import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage } from '../../page.js'
import { lineKey } from '../selection/line-key.js'
import { forgetRows } from '../selection/rows.js'

// A line saves what the trader ticked: the code, the Latin name and the common
// name from the search row. Its type follows from the code and species and is
// always non-blank, so every line completes.
export const seedLine = (row) => ({
  commoditySelection: row.code,
  speciesSelection: row.latinName,
  ...(row.commonName ? { commonName: row.commonName } : {}),
  commodityType: commodities.typeIdFor(row.code, row.latinName),
  numberOfPackages: '',
  numberOfAnimalsQuantity: ''
})

const detailsPath = (request) =>
  kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, consignmentDetailsPage.slug)
  )

const selectionTarget = async (request, scope) =>
  kit.hubExitTarget(request) ??
  (kit.changeContext(request)
    ? detailsPath(request)
    : await kit.nextTarget(request, commoditiesPage, scope))

export const commitSelection = async (request, h, rows) => {
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKey,
    rows.map(seedLine)
  )
  await forgetRows(request, h)
  const { scope } = await state.get(request, h)
  return h.redirect(await selectionTarget(request, scope))
}
