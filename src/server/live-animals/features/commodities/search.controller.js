import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { commoditiesPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'
import {
  isReRenderAction,
  typeFiltersFromPayload,
  withRemovalApplied
} from './search/actions/payload.js'
import {
  renderSearchOrRemove,
  renderSelectionRequired
} from './search/actions/render.js'
import { commitSelection } from './search/actions/commit-selection.js'
import {
  selectedKeysFromPayload,
  storedKeys
} from './search/selection/selected-keys.js'
import { resultGroups } from './search/view-model/result-groups.js'
import { selectedSummary } from './search/view-model/selected-summary.js'

export { lineKey } from './search/selection/line-key.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search`

const copy = copyFor({ en, cy }).search

const render = (
  request,
  h,
  journey,
  { query = '', selected, typeFilters = {}, errors = {} }
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey
    }),
    copy,
    query,
    results: resultGroups(query, selected, typeFilters, copy),
    searched: query.trim() !== '',
    selectedSummary: selectedSummary(selected),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, { selected: storedKeys(answers) })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = payload.action ?? ''
  const query = payload.search ?? ''
  const typeFilters = typeFiltersFromPayload(payload)
  const selected = selectedKeysFromPayload(payload)

  if (isReRenderAction(action)) {
    return renderSearchOrRemove(
      request,
      h,
      query,
      withRemovalApplied(action, selected),
      typeFilters,
      render
    )
  }

  if (selected.length === 0) {
    return renderSelectionRequired(
      request,
      h,
      query,
      selected,
      typeFilters,
      render,
      copy.errors.selectCommodity
    )
  }

  return commitSelection(request, h, selected)
}

export const routes = kit.pageRoutes(page, { get, post })
