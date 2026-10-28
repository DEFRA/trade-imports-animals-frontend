import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { consignmentDetailsPage as page } from '../../page.js'
import { commodityCodesOf, entriesNotOfCode, linesOf } from '../../lines.js'
import { commodityQuestionPath } from '../../commodity-question-detour.js'

export const groupCodes = (answers, evaluation) =>
  commodityCodesOf(linesOf(answers, evaluation))

const afterRemoval = (request, h, kept) => {
  if (kept.length === 0) {
    return h.redirect(commodityQuestionPath(request))
  }
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}

export const postRemove = async (request, h, index, lineKey) => {
  const { answers, evaluation } = await state.get(request, h)
  const code = groupCodes(answers, evaluation)[index]
  if (code === undefined) {
    kit.logRefusal(request, { reason: 'no-commodity-at-index', index })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = entriesNotOfCode(answers.commodityLines ?? [], code)
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}

export const postRemoveSpecies = async (request, h, index, lineKey) => {
  const { answers } = await state.get(request, h)
  const stored = answers.commodityLines ?? []
  const line = stored[index]
  if (
    line === undefined ||
    !commodities.listsSpeciesIndividually(line.commodityCode)
  ) {
    kit.logRefusal(request, {
      reason: 'no-species-at-index',
      index,
      commodityCode: line?.commodityCode
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = stored.toSpliced(index, 1)
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return afterRemoval(request, h, kept)
}
