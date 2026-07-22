import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  requiredExactDigits,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as commodities from '../../services/commodities/index.js'
import { cphNumberPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['countyParishHoldingCph'] }
const view = `${TEMPLATES}/features/cph-number/template`

const copy = copyFor({ en, cy })

const asArray = (value) => [].concat(value ?? [])

export const isCphApplicable = (answers) =>
  asArray(answers.commodityLines).some((line) =>
    commodities.cphCommodities().includes(line?.commoditySelection)
  )

const CPH_DIGITS = 9

const fields = compose(
  requiredExactDigits('countyParishHoldingCph', CPH_DIGITS, {
    required: copy.errors.cphRequired,
    length: copy.errors.cphLength,
    digitsOnly: copy.errors.cphDigitsOnly
  })
)

const hubEntryReturn = (request) =>
  request.query.return === 'addresses' ? pagePath('addresses') : null

const render = (request, h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubEntryReturn(request) ?? hubPath(),
      journey
    }),
    copy,
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
      (await kit.nextTarget(request, page, scope))
  )
}

export const routes = kit.pageRoutes(page, { get, post })
