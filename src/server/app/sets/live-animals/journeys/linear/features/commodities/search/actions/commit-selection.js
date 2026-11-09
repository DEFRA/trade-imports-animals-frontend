import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commodityQuestionReturn } from '../../commodity-question-detour.js'
import { commoditiesPage } from '../../page.js'
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

const resolveAndLogHonouredReturn = (request) => {
  const { honouredReturn } = commodityQuestionReturn(request)
  if (honouredReturn) {
    request.logger.info(
      { journeyId: request.params.journeyId, honouredReturn },
      'Commodity question saved: returning to the page that opened it'
    )
  }
  return honouredReturn
}

const selectionTarget = (request, scope) =>
  kit.hubExitTarget(request) ??
  resolveAndLogHonouredReturn(request) ??
  kit.nextTarget(request, commoditiesPage, scope)

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
  return h.redirect(selectionTarget(request, scope))
}
