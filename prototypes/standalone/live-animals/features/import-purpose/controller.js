import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { importPurposePage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/import-purpose/template`

/** V4 eleven-value internal-market purpose enum (provisional page, c-012). */
export const PURPOSE_IN_INTERNAL_MARKET_LABEL = {
  'transfer-of-ownership-sale-gift': 'Transfer of ownership - Sale/gift',
  'transfer-of-ownership-rescue': 'Transfer of ownership - Rescue',
  breeding: 'Breeding',
  research: 'Research',
  'racing-competition-show-or-training':
    'Racing, competition, show or training',
  'approved-premises-or-body': 'Approved premises or body',
  'companion-animal-not-for-resale-or-rehoming':
    'Companion animal not for resale or rehoming',
  production: 'Production',
  slaughter: 'Slaughter',
  fattening: 'Fattening',
  restocking: 'Restocking'
}

// purposeInInternalMarket is enforcedAt=submit: blank passes validation and
// the obligation stays an open requirement for the status roll-up (In
// progress, not a validation error). Only an out-of-domain value blocks the
// save.
const fields = compose(
  oneOf(
    'purposeInInternalMarket',
    Object.keys(PURPOSE_IN_INTERNAL_MARKET_LABEL)
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Purpose in the internal market', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    purposeOptions: Object.entries(PURPOSE_IN_INTERNAL_MARKET_LABEL).map(
      ([value, text]) => ({
        value,
        text,
        checked: value === values.purposeInInternalMarket
      })
    )
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    purposeInInternalMarket: answers.purposeInInternalMarket ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    purposeInInternalMarket: payload.purposeInInternalMarket ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
