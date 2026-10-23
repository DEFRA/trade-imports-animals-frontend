import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { commoditiesPage, consignmentDetailsPage as page } from '../../page.js'
import { commodityNamesOf, linesOf } from '../../lines.js'

export const groupNames = (answers, evaluation) =>
  commodityNamesOf(linesOf(answers, evaluation))

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

export const postRemove = async (request, h, index, lineKey) => {
  const { answers, evaluation } = await state.get(request, h)
  const name = groupNames(answers, evaluation)[index]
  if (name === undefined) {
    kit.logRefusal(request, { reason: 'no-commodity-at-index', index })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = (answers.commodityLines ?? []).filter(
    (entry) => entry.commoditySelection !== name
  )
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}

export const postRemoveSpecies = async (request, h, index, lineKey) => {
  const { answers } = await state.get(request, h)
  const stored = answers.commodityLines ?? []
  const line = stored[index]
  if (
    line === undefined ||
    !commodities.speciesListedIndividually(line.commoditySelection)
  ) {
    kit.logRefusal(request, { reason: 'no-species-at-index', index })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = stored.toSpliced(index, 1)
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}
