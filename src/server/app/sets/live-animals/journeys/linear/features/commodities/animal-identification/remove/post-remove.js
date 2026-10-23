import { pagePath } from '../../../../../../../../shared/paths.js'
import * as state from '../../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../../shared/kit.js'
import { animalIdentificationPage as page } from '../../page.js'

const REMOVE_ACTION_PREFIX = 'remove:'

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

const removeTargetOf = (action) => {
  const [line, unit] = action.slice(REMOVE_ACTION_PREFIX.length).split(':')
  return { line: Number(line), unit: Number(unit) }
}

const unitAt = (answers, line, unit) =>
  (answers.commodityLines ?? [])[line]?.animalIdentifiers?.[unit]

export const postRemove = async (request, h, action) => {
  const { answers } = await state.get(request, h)
  const { line, unit } = removeTargetOf(action)
  if (!unitAt(answers, line, unit)) {
    kit.logRefusal(request, {
      reason: 'no-animal-identifier-at-index',
      lineIndex: line,
      unitIndex: unit
    })
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }
  await state.removeEntryAt(
    request,
    h,
    ['commodityLines', line, 'animalIdentifiers'],
    unit
  )
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}
