import { hubPath, pagePath } from '../../../../../../../../shared/paths.js'
import { inTemplateMode } from '../../../../../../../../shared/template-mode.js'
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

// While a template is being created, the commodity question returns to the
// template's task list rather than going on through the journey.
const selectionTarget = async (request, scope) => {
  const hubExit = kit.hubExitTarget(request)
  if (hubExit) {
    return hubExit
  }
  if (inTemplateMode()) {
    return hubPath(request.params.journeyId)
  }
  return kit.changeContext(request)
    ? detailsPath(request)
    : await kit.nextTarget(request, commoditiesPage, scope)
}

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
