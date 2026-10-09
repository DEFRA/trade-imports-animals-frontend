import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage } from '../../page.js'
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

const detailsPath = (request) =>
  kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, consignmentDetailsPage.slug)
  )

const selectionTarget = async (request, scope) =>
  kit.hubExitTarget(request) ??
  (kit.changeContext(request)
    ? detailsPath(request)
    : ((await kit.runTarget(request, commoditiesPage.id, scope)) ??
      detailsPath(request)))

export const commitSelection = async (request, h, selected) => {
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKey,
    selected.map(seedLine)
  )
  const { scope } = await state.get(request, h)
  return h.redirect(await selectionTarget(request, scope))
}
