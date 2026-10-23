import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { commoditiesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { commitSelection } from './actions/commit-selection.js'
import { isSearchable, normaliseQuery } from './matching.js'
import { mergedKeysFromPayload, storedKeys } from './selection/selected-keys.js'
import { commodityGroups } from './view-model/commodity-groups.js'
import { selectedSummary } from './view-model/selected-summary.js'

export { lineKey } from './selection/line-key.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search/search`

const copy = copyFor({ en, cy }).search

export const SEARCH_FIELD = 'commoditySearch'
const SEARCH_ACTION = 'search'
const CLEAR_ACTION = 'clear'

const render = async (
  request,
  h,
  current,
  { selected, query = '', errorText = null }
) => {
  const groups = commodityGroups(selected, query)
  const onScreen = new Set(
    groups.flatMap((group) => group.items.map((item) => item.value))
  )
  const errors = errorText ? { [SEARCH_FIELD]: errorText } : {}
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
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

const rerender = async (request, h, { selected, query, errorText }) => {
  const current = await state.get(request, h)
  return render(request, h, current, { selected, query, errorText })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = normaliseQuery(payload[SEARCH_FIELD])

  if (payload.action === CLEAR_ACTION) {
    return rerender(request, h, { selected: [], query })
  }

  const selected = mergedKeysFromPayload(payload)

  if (payload.action === SEARCH_ACTION) {
    return rerender(request, h, { selected, query })
  }

  if (selected.length === 0 && !kit.isHubExit(request)) {
    kit.logRefusal(request, {
      fieldErrors: { [SEARCH_FIELD]: copy.errors.selectCommodity }
    })
    const response = await rerender(request, h, {
      selected,
      query,
      errorText: copy.errors.selectCommodity
    })
    return response.code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, selected)
}

export const routes = kit.pageRoutes(page, { get, post })
