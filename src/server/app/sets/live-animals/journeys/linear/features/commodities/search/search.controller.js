import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
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
import {
  knownRowsByKey,
  replaceStoredSearchRows,
  resultRows
} from './selection/rows.js'
import { commodityGroups } from './view-model/commodity-groups.js'
import { selectedSummary } from './view-model/selected-summary.js'

export { lineKey } from './selection/line-key.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search/search`

const copy = copyFor({ en, cy }).search

export const SEARCH_FIELD = 'commoditySearch'

const searchFor = (query) =>
  isSearchable(query) ? search(query, { size: 100 }) : null

const rowsFor = (keys, rowsByKey) => keys.map((key) => rowsByKey.get(key))

const render = async (
  request,
  h,
  current,
  { selected, results = null, query = '', errorText = null }
) => {
  const groups = commodityGroups(results, selected)
  const onScreen = new Set(
    groups.flatMap((group) => group.items.map((item) => item.value))
  )
  const errors = errorText ? { [SEARCH_FIELD]: errorText } : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink:
        commodityQuestionReturn(request).honouredReturn ??
        (await kit.runBackLink(request, page.id, current)),
      journey: current.journey,
      page
    }),
    copy,
    query,
    commodityGroups: groups,
    noResults: isSearchable(query) && groups.length === 0,
    carriedKeys: selected.filter((key) => !onScreen.has(key)),
    selectedSummary: selectedSummary(selected),
    errors,
    errorSummary: kit.errorSummary(errors)
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(request, h, current, {
    selected: storedKeys(current.answers)
  })
}

const searchStoreRowsAndRender = async (
  request,
  h,
  rowsByKey,
  { selected, query, errorText }
) => {
  const results = await searchFor(query)
  await replaceStoredSearchRows(request, h, [
    ...rowsByKey.values(),
    ...resultRows(results)
  ])
  const current = await state.get(request, h)
  return render(request, h, current, { selected, results, query, errorText })
}

const post = async (request, h) => {
  const SEARCH_ACTION = 'search'
  const CLEAR_ACTION = 'clear'
  const payload = request.payload ?? {}
  const query = normaliseQuery(payload[SEARCH_FIELD])
  const rowsByKey = knownRowsByKey(await state.get(request, h))

  if (payload.action === CLEAR_ACTION) {
    return searchStoreRowsAndRender(request, h, rowsByKey, {
      selected: [],
      query
    })
  }

  const selected = mergedKeysFromPayload(payload, rowsByKey)
  const droppedKeys = droppedKeysFromPayload(payload, rowsByKey)
  if (droppedKeys.length > 0) {
    request.logger.warn(
      { journeyId: request.params.journeyId, droppedKeys },
      'Commodity choices not in the stored search rows were dropped'
    )
  }

  if (payload.action === SEARCH_ACTION) {
    return searchStoreRowsAndRender(request, h, rowsByKey, {
      selected,
      query
    })
  }

  if (selected.length === 0) {
    const response = await searchStoreRowsAndRender(request, h, rowsByKey, {
      selected,
      query,
      errorText: copy.errors.selectCommodity
    })
    return response.code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, rowsFor(selected, rowsByKey))
}

export const routes = kit.pageRoutes(page, { get, post })
