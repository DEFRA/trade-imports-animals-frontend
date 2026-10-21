import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage } from '../../page.js'
import { lineKey } from '../selection/line-key.js'
import { clearStoredSearchRows } from '../selection/rows.js'

export const seedLine = ({ commodityCode, speciesLatinName, commonName }) => ({
  commodityCode,
  speciesLatinName,
  ...(commonName ? { commonName } : {}),
  commodityType: commodities.typeIdFor(commodityCode, speciesLatinName),
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
  await clearStoredSearchRows(request, h)
  const { scope } = await state.get(request, h)
  return h.redirect(await selectionTarget(request, scope))
}
