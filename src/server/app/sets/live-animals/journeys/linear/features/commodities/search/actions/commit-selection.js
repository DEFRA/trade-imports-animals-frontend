import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commodityQuestionReturn } from '../../commodity-question-detour.js'
import { commoditiesPage, consignmentDetailsPage } from '../../page.js'
import { lineKey } from '../selection/line-key.js'
import { clearStoredSearchRows } from '../selection/rows.js'

export const seedLine = ({
  commodityCode,
  speciesLatinName,
  speciesCommonName
}) => ({
  commodityCode,
  speciesLatinName,
  ...(speciesCommonName ? { speciesCommonName } : {}),
  commodityType: commodities.typeIdFor(commodityCode, speciesLatinName),
  numberOfPackages: '',
  numberOfAnimalsQuantity: ''
})

const detailsPath = (request) =>
  kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, consignmentDetailsPage.slug)
  )

const logAndResolveDetourReturn = (request) => {
  const { honouredReturn, refusedMarker } = commodityQuestionReturn(request)
  const { journeyId } = request.params
  const maxLoggedMarkerLength = 100
  if (refusedMarker !== undefined) {
    request.logger.warn(
      {
        journeyId,
        refusedMarker: String(refusedMarker).slice(0, maxLoggedMarkerLength)
      },
      'Commodity question return refused: not a page that opens it'
    )
  }
  if (honouredReturn) {
    request.logger.info(
      { journeyId, honouredReturn },
      'Commodity question saved: returning to the page that opened it'
    )
  }
  return honouredReturn
}

const selectionTarget = async (request, scope) =>
  kit.hubExitTarget(request) ??
  logAndResolveDetourReturn(request) ??
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
