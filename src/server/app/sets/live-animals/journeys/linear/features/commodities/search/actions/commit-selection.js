import { pagePath } from '../../../../../../../../config.js'
import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../../../services/commodities/index.js'
import { consignmentDetailsPage } from '../../page.js'
import { splitKey } from '../selection/keys.js'
import { lineKey } from '../selection/line-key.js'

// The line's type is its species' owning type id — always non-blank, so every
// line completes. Multi-type commodities (Cow) carry the type determined by
// the checked species; single-type commodities collapse to their one type id.
export const seedLine = (key) => {
  const [commoditySelection, speciesSelection] = splitKey(key)
  return {
    commoditySelection,
    speciesSelection,
    commodityType: commodities.typeIdForSpecies(
      commoditySelection,
      speciesSelection
    ),
    numberOfPackages: '',
    numberOfAnimalsQuantity: ''
  }
}

export const commitSelection = async (request, h, selected) => {
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKey,
    selected.map(seedLine)
  )
  return h.redirect(
    kit.hubExitTarget(request) ??
      kit.withChangeContext(
        request,
        pagePath(request.params.journeyId, consignmentDetailsPage.slug)
      )
  )
}
