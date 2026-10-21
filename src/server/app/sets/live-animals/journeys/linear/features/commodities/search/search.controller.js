import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { commoditiesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { search } from '../../../../../services/commodities/search.js'
import { commitSelection } from './actions/commit-selection.js'
import { SEARCH_PAGE_SIZE, isSearchable, normaliseQuery } from './matching.js'
import { mergedKeysFromPayload, storedKeys } from './selection/selected-keys.js'
import {
  knownRows,
  replaceStoredSearchRows,
  resultRows
} from './selection/rows.js'
import { commodityGroups } from './view-model/commodity-groups.js'
import { selectedSummary } from './view-model/selected-summary.js'

export { lineKey } from './selection/line-key.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search/search`

const copy = copyFor({ en, cy }).search

const SEARCH_ACTION = 'search'
const CLEAR_ACTION = 'clear'

const searchFor = (query) =>
  isSearchable(query) ? search(query, { size: SEARCH_PAGE_SIZE }) : null

const rowsFor = (keys, knownRowsByKey) =>
  keys.map((key) => knownRowsByKey.get(key))

const render = (
  h,
  journey,
  { selected, results = null, query = '', errorText = null }
) => {
  const groups = commodityGroups(results, selected)
  const onScreen = new Set(
    groups.flatMap((group) => group.items.map((item) => item.value))
  )
  // The error belongs on the control the trader must fix: the tick boxes when
  // results are listed, the search box when there is nothing yet to tick.
  const errorField = groups.length > 0 ? 'species' : 'commoditySearch'
  const errors = errorText ? { [errorField]: errorText } : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request: h.request,
      backLink: hubPath(journey.journeyId),
      journey,
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
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { selected: storedKeys(answers) })
}

const searchStoreRowsAndRender = async (
  request,
  h,
  knownRowsByKey,
  { selected, query, errorText }
) => {
  const results = await searchFor(query)
  await replaceStoredSearchRows(request, h, [
    ...rowsFor(selected, knownRowsByKey),
    ...resultRows(results)
  ])
  const { journey } = await state.get(request, h)
  return render(h, journey, { selected, results, query, errorText })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = normaliseQuery(payload.commoditySearch)
  const knownRowsByKey = knownRows(await state.get(request, h))

  if (payload.action === CLEAR_ACTION) {
    return searchStoreRowsAndRender(request, h, knownRowsByKey, {
      selected: [],
      query
    })
  }

  const selected = mergedKeysFromPayload(payload, knownRowsByKey)

  if (payload.action === SEARCH_ACTION) {
    return searchStoreRowsAndRender(request, h, knownRowsByKey, {
      selected,
      query
    })
  }

  if (selected.length === 0 && !kit.isHubExit(request)) {
    const response = await searchStoreRowsAndRender(
      request,
      h,
      knownRowsByKey,
      { selected, query, errorText: copy.errors.selectCommodity }
    )
    return response.code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, rowsFor(selected, knownRowsByKey))
}

export const routes = kit.pageRoutes(page, { get, post })
