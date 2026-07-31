import { hubPath, TEMPLATES } from '../../../../../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { commoditiesPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { commitSelection } from './actions/commit-selection.js'
import {
  selectedKeysFromPayload,
  storedKeys
} from './selection/selected-keys.js'
import { commodityGroups } from './view-model/commodity-groups.js'

export { lineKey } from './selection/line-key.js'

export const meta = { ...page, collects: ['commodityLines'] }
const view = `${TEMPLATES}/features/commodities/search/search`

const copy = copyFor({ en, cy }).search

const render = (h, journey, { selected, errors = {} }) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey
    }),
    copy,
    commodityGroups: commodityGroups(selected),
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { selected: storedKeys(answers) })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const selected = selectedKeysFromPayload(payload)

  if (selected.length === 0) {
    const { journey } = await state.get(request, h)
    return render(h, journey, {
      selected,
      errors: { species: copy.errors.selectCommodity }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, selected)
}

export const routes = kit.pageRoutes(page, { get, post })
