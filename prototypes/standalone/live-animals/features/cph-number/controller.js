import { hubPath, pagePath, TEMPLATES } from '../../config.js'
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

const hubEntryReturn = (request) =>
  request.query.return === 'addresses' ? pagePath('addresses') : null

const render = (request, h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('County Parish Holding (CPH)', {
      backLink: hubEntryReturn(request) ?? hubPath(),
      journey
    }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(request, h, journey, {
    countyParishHoldingCph: answers.countyParishHoldingCph ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const rawCphNumber = payload.countyParishHoldingCph ?? ''
  const values = {
    countyParishHoldingCph: rawCphNumber.replace(/\//g, '')
  }
  const { errors } = validate(fields, values)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(
      request,
      h,
      journey,
      { countyParishHoldingCph: rawCphNumber },
      errors
    )
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(
    kit.hubExitTarget(request) ??
      hubEntryReturn(request) ??
      kit.nextTarget(request, page, scope)
  )
}

export const routes = kit.pageRoutes(page, { get, post })
