import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import * as commodities from '../../services/commodities/index.js'

const view = `${TEMPLATES}/features/commodities/details`

export const packagesApply = (commoditySelection) =>
  commodities.packageCountCommodities().includes(commoditySelection)

const fields = compose(
  integerInRange('numberOfAnimalsQuantity', {
    min: 1,
    message: 'Number of animals must be a whole number, like 25'
  }),
  integerInRange('numberOfPackages', {
    min: 1,
    message: 'Number of packages must be a whole number, like 5'
  })
)

const lineIndexOf = (request, answers) => {
  const index = Number(request.params.index)
  const lines = answers.commodityLines ?? []
  return Number.isInteger(index) && index >= 0 && index < lines.length
    ? index
    : null
}

const render = (h, line, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Description of goods', { backLink: pagePath('commodities') }),
    heading: 'Description of goods',
    commodity: line.commoditySelection,
    showPackages: packagesApply(line.commoditySelection),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) return h.redirect(pagePath('commodities'))
  const line = answers.commodityLines[index]
  return render(h, line, {
    numberOfAnimalsQuantity: line.numberOfAnimalsQuantity ?? '',
    numberOfPackages: line.numberOfPackages ?? ''
  })
}

const post = (request, h) => {
  const { answers } = state.get(request, h)
  const index = lineIndexOf(request, answers)
  if (index === null) return h.redirect(pagePath('commodities'))
  const line = answers.commodityLines[index]
  const payload = request.payload ?? {}
  const values = {
    numberOfAnimalsQuantity: (payload.numberOfAnimalsQuantity ?? '').trim(),
    numberOfPackages: (payload.numberOfPackages ?? '').trim()
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, line, values, errors)

  state.updateEntry(request, h, 'commodityLines', index, {
    ...line,
    numberOfAnimalsQuantity: values.numberOfAnimalsQuantity,
    ...(packagesApply(line.commoditySelection)
      ? { numberOfPackages: values.numberOfPackages }
      : {})
  })
  return h.redirect(pagePath('commodities'))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('commodities/{index}/details'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('commodities/{index}/details'),
    options: open,
    handler: post
  }
]
