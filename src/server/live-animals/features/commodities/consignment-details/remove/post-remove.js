import { pagePath } from '../../../../config.js'
import * as state from '../../../../engine/index.js'
import * as kit from '../../../../shared/kit.js'
import { consignmentDetailsPage as page } from '../../page.js'
import { linesOf } from '../lines.js'

const HTTP_STATUS_BAD_REQUEST = 400
export const REMOVE_ACTION_PREFIX = 'remove:'

export const isRemoveAction = (action) =>
  action.startsWith(REMOVE_ACTION_PREFIX)

export const removeIndexOf = (action) =>
  Number(action.slice(REMOVE_ACTION_PREFIX.length))

export const groupNames = (answers, evaluation) => [
  ...new Set(
    linesOf(answers, evaluation).map(({ entry }) => entry.commoditySelection)
  )
]

// A removal drops every line of one commodity group, so it submits the page
// form — the crumb travels with it and no GET can trigger it. The group index
// keys back to a name in the journey; anything else is refused before any
// reconcile runs.
export const postRemove = async (request, h, index, lineKey) => {
  const { answers, evaluation } = await state.get(request, h)
  const name = groupNames(answers, evaluation)[index]
  if (name === undefined) return h.response().code(HTTP_STATUS_BAD_REQUEST)

  const kept = (answers.commodityLines ?? []).filter(
    (entry) => entry.commoditySelection !== name
  )
  await state.reconcileEntriesAt(request, h, ['commodityLines'], lineKey, kept)
  return h.redirect(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    )
  )
}
