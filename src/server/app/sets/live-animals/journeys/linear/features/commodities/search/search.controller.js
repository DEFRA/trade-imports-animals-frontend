import Boom from '@hapi/boom'

import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { pagePath, pageRoutePath } from '../../../../../../../shared/paths.js'
import { commodityQuestionReturn } from '../commodity-question-detour.js'
import { commoditiesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { search } from '../../../../../services/commodities/search.js'
import { commitSelection } from './actions/commit-selection.js'
import { isSearchable, normaliseQuery } from './search-query.js'
import {
  droppedKeysFromPayload,
  mergedKeysFromPayload,
  storedKeys
} from './selection/selected-keys.js'
import { isRemoveAction, removeKeyOf } from './selection/remove-action.js'
import {
  knownRowsByKey,
  replaceStoredSearchRows,
  resultRows
} from './selection/rows.js'
import { commodityGroups } from './view-model/commodity-groups.js'
import { selectedSummary } from './view-model/selected-summary.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search/search`
const resultsView = `${TEMPLATES}/features/commodities/search/search-results`

const copy = copyFor({ en, cy }).search

export const SEARCH_FIELD = 'commoditySearch'
export const RESULTS_SLUG = `${page.slug}/results`

const SEARCH_ACTION = 'search'
const CLEAR_ACTION = 'clear'

const searchFor = (query) =>
  isSearchable(query) ? search(query, { size: 100 }) : null

const rowsFor = (keys, rowsByKey) => keys.map((key) => rowsByKey.get(key))

const resultsContext = (current, { selected, results = null, query = '' }) => {
  const groups = commodityGroups(results, selected, query)
  const onScreen = new Set(
    groups.flatMap((group) => group.items.map((item) => item.value))
  )
  return {
    copy,
    query,
    commodityGroups: groups,
    noResults: isSearchable(query) && groups.length === 0,
    carriedKeys: selected.filter((key) => !onScreen.has(key)),
    selectedSummary: selectedSummary(rowsFor(selected, knownRowsByKey(current)))
  }
}

const render = (request, h, current, { errorText = null, ...shown }) => {
  const errors = errorText ? { [SEARCH_FIELD]: errorText } : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink:
        commodityQuestionReturn(request).honouredReturn ??
        kit.trailBackLink(request),
      journey: current.journey,
      page
    }),
    ...resultsContext(current, shown),
    resultsUrl: pagePath(request.params.journeyId, RESULTS_SLUG),
    errors,
    errorSummary: kit.errorSummary(errors)
  })
}

const speciesCountOf = (groups) =>
  groups.reduce((count, group) => count + group.items.length, 0)

const announcementFor = ({ query, commodityGroups: groups }) => {
  if (!isSearchable(query)) {
    return ''
  }
  const count = speciesCountOf(groups)
  return count === 0 ? copy.noResults : copy.resultsAvailable(count)
}

const renderResults = (_request, h, current, shown) => {
  const context = resultsContext(current, shown)
  return h.view(resultsView, {
    ...context,
    announcement: announcementFor(context)
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(request, h, current, {
    selected: storedKeys(current.answers)
  })
}

const searchAndStoreRows = async (
  request,
  h,
  rowsByKey,
  { selected, query }
) => {
  const results = await searchFor(query)
  await replaceStoredSearchRows(request, h, [
    ...rowsByKey.values(),
    ...resultRows(results)
  ])
  const current = await state.get(request, h)
  return { current, shown: { selected, results, query } }
}

const logDroppedKeys = (request, payload, rowsByKey) => {
  const droppedKeys = droppedKeysFromPayload(payload, rowsByKey)
  if (droppedKeys.length > 0) {
    request.logger.warn(
      { journeyId: request.params.journeyId, droppedKeys },
      'Commodity choices not in the stored search rows were dropped'
    )
  }
}

const readPost = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  const query = normaliseQuery(payload[SEARCH_FIELD])
  const rowsByKey = knownRowsByKey(await state.get(request, h))
  if (action === CLEAR_ACTION) {
    return { action, query, rowsByKey, selected: [] }
  }
  logDroppedKeys(request, payload, rowsByKey)
  return {
    action,
    query,
    rowsByKey,
    selected: mergedKeysFromPayload(payload, rowsByKey)
  }
}

const keepsWorkingOnSelection = (action) =>
  action === SEARCH_ACTION || action === CLEAR_ACTION || isRemoveAction(action)

const selectionAfterRemoval = ({ action, selected }) =>
  isRemoveAction(action)
    ? selected.filter((key) => key !== removeKeyOf(action))
    : selected

const refuseUnknownRemoval = (request, { action, rowsByKey }) => {
  if (!isRemoveAction(action) || rowsByKey.has(removeKeyOf(action))) {
    return null
  }
  kit.logRefusal(request, {
    reason: 'no-species-for-key',
    key: removeKeyOf(action)
  })
  return Boom.badRequest()
}

const showSelectionWork = async (request, h, posted, renderShown) => {
  const refusal = refuseUnknownRemoval(request, posted)
  if (refusal) {
    return refusal
  }
  const { current, shown } = await searchAndStoreRows(
    request,
    h,
    posted.rowsByKey,
    { selected: selectionAfterRemoval(posted), query: posted.query }
  )
  return renderShown(request, h, current, shown)
}

const post = async (request, h) => {
  const posted = await readPost(request, h)

  if (keepsWorkingOnSelection(posted.action)) {
    return showSelectionWork(request, h, posted, render)
  }

  if (posted.selected.length === 0) {
    const { current, shown } = await searchAndStoreRows(
      request,
      h,
      posted.rowsByKey,
      { selected: [], query: posted.query }
    )
    const response = render(request, h, current, {
      ...shown,
      errorText: copy.errors.selectCommodity
    })
    return response.code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, rowsFor(posted.selected, posted.rowsByKey))
}

const postResults = async (request, h) =>
  showSelectionWork(request, h, await readPost(request, h), renderResults)

export const routes = [
  ...kit.pageRoutes(page, { get, post }),
  {
    method: 'POST',
    path: pageRoutePath(RESULTS_SLUG),
    options: kit.pageRouteOptions(page),
    handler: postResults
  }
]
