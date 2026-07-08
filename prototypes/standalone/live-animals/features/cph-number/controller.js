import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as commodities from '../../services/commodities/index.js'
import { cphNumberPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/cph-number/template`

export const cphApplies = (answers) =>
  []
    .concat(answers.commodityLines ?? [])
    .some((line) =>
      commodities.cphCommodities().includes(line?.commoditySelection)
    )

const fields = compose(
  maxText(
    'countyParishHoldingCph',
    11,
    'County Parish Holding (CPH) number must be 11 characters or fewer'
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('County Parish Holding (CPH)', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    countyParishHoldingCph: answers.countyParishHoldingCph ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    countyParishHoldingCph: payload.countyParishHoldingCph ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
