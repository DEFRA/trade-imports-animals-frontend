import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { entriesNotOfCode } from '../../lines.js'
import { commodityQuestionPath } from '../../commodity-question-detour.js'

const afterRemoval = (request, h, kept, commodityCode, renderSurvivors) => {
  if (kept.length === 0) {
    request.logger.info(
      {
        journeyId: request.params.journeyId,
        reason: 'last-commodity-removed',
        commodityCode
      },
      'Redirected to the commodity question'
    )
    return h.redirect(commodityQuestionPath(request))
  }
  return renderSurvivors()
}

export const postRemove = async (
  request,
  h,
  commodityCode,
  lineKeyOf,
  renderSurvivors
) => {
  const { answers } = await state.get(request, h)
  const stored = answers.commodityLines ?? []
  if (!stored.some((entry) => entry.commodityCode === commodityCode)) {
    kit.logRefusal(request, {
      reason: 'no-commodity-for-code',
      code: commodityCode
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = entriesNotOfCode(stored, commodityCode)
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKeyOf,
    kept
  )
  return afterRemoval(request, h, kept, commodityCode, renderSurvivors)
}

export const postRemoveSpecies = async (
  request,
  h,
  key,
  lineKeyOf,
  renderSurvivors
) => {
  const { answers } = await state.get(request, h)
  const stored = answers.commodityLines ?? []
  const line = stored.find((entry) => lineKeyOf(entry) === key)
  if (
    line === undefined ||
    !commodities.listsSpeciesIndividually(line.commodityCode)
  ) {
    kit.logRefusal(request, {
      reason: 'no-species-for-key',
      key,
      commodityCode: line?.commodityCode
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const kept = stored.filter((entry) => lineKeyOf(entry) !== key)
  await state.reconcileEntriesAt(
    request,
    h,
    ['commodityLines'],
    lineKeyOf,
    kept
  )
  return afterRemoval(request, h, kept, line.commodityCode, renderSurvivors)
}
