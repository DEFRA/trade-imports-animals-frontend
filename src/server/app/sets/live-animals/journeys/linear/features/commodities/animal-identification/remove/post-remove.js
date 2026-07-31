import { pagePath } from '../../../../../../../../config.js'
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

// A removal deletes one identifier record, so it submits the card form — the
// crumb travels with it and no GET can trigger it. Line and unit must both
// resolve to a stored record; anything else is refused before any delete runs.
export const postRemove = async (request, h, action) => {
  const { answers } = await state.get(request, h)
  const { line, unit } = removeTargetOf(action)
  if (!unitAt(answers, line, unit)) {
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
