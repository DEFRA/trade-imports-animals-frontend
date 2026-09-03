import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage as page } from '../../page.js'
import { commodityNamesOf, linesOf } from '../lines.js'

export const groupNames = (answers, evaluation) =>
  commodityNamesOf(linesOf(answers, evaluation))

// While a line is left the page still has quantities to collect, so a removal
// returns to it. Take the last line out and it has nothing to ask, so the user
// goes back to the commodity question instead — that is where the next answer
// has to come from, and it saves them spotting a link on an empty page.
const afterRemoval = (request, h, kept) =>
  h.redirect(
    kit.withChangeContext(
      request,
      pagePath(
        request.params.journeyId,
        kept.length > 0 ? page.slug : commoditiesPage.slug
      )
    )
  )

// A removal drops every line of one commodity group, so it submits the page
// form — the crumb travels with it and no GET can trigger it. The group index
// keys back to a name in the journey; anything else is refused before any
// reconcile runs.
export const postRemove = async (request, h, index, lineKey) => {
  const { answers, evaluation } = await state.get(request, h)
  const name = groupNames(answers, evaluation)[index]
  if (name === undefined) {
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = (answers.commodityLines ?? []).filter(
    (entry) => entry.commoditySelection !== name
  )
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}

// A species removal drops one line and leaves the rest of its commodity in
// place. The page only offers it for the commodities the design lists species
// by species, so the line index must name a stored line of one of those;
// anything else is refused before any reconcile runs.
export const postRemoveSpecies = async (request, h, index, lineKey) => {
  const { answers } = await state.get(request, h)
  const stored = answers.commodityLines ?? []
  const line = stored[index]
  if (
    line === undefined ||
    !commodities.speciesListedIndividually(line.commoditySelection)
  ) {
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = stored.toSpliced(index, 1)
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}
