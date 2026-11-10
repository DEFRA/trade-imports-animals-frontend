import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import { animalIdentificationPage as page } from '../../page.js'
import { actionsPrefixed } from '../../action-prefix.js'
import { lineKey } from '../../search/selection/line-key.js'

const removeActions = actionsPrefixed('remove:')

export const isRemoveAction = removeActions.isAction

const removeTargetOf = (answers, action) => {
  const [key, unit] = removeActions.keyOf(action).split(':')
  const lineIndex = (answers.commodityLines ?? []).findIndex(
    (entry) => lineKey(entry) === key
  )
  return { key, lineIndex, unit: Number(unit) }
}

const unitAt = (answers, lineIndex, unit) =>
  (answers.commodityLines ?? [])[lineIndex]?.animalIdentifiers?.[unit]

export const postRemove = async (request, h, action) => {
  const { answers } = await state.get(request, h)
  const { key, lineIndex, unit } = removeTargetOf(answers, action)
  if (lineIndex === -1) {
    kit.logRefusal(request, {
      reason: 'no-commodity-line-for-key',
      key,
      unitIndex: unit
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }
  if (!unitAt(answers, lineIndex, unit)) {
    kit.logRefusal(request, {
      reason: 'no-animal-identifier-at-index',
      lineIndex,
      unitIndex: unit
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }
  await state.removeEntryAt(
    request,
    h,
    ['commodityLines', lineIndex, 'animalIdentifiers'],
    unit
  )
  return h.redirect(
    kit.carryTrail(request, pagePath(request.params.journeyId, page.slug))
  )
}
