import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { commoditiesPage } from '../page.js'

export const redirectEmptyLinesToCommodityQuestion = (
  request,
  h,
  { commodityCodeCount }
) => {
  request.logger.info(
    {
      journeyId: request.params.journeyId,
      commodityCodeCount
    },
    'Consignment details has no commodities, commodity question shown'
  )
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, commoditiesPage.slug)
    )
  )
}
