import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  currency,
  integerInRange,
  validate,
  vehicleReg
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { yourVehiclePage as page } from './page.js'
import { obligations } from './obligations.js'

/** Your vehicle — all fields soft (save blank). vehiclePhoto is render-only
 * (never stored, spike parity). Format checks (registration pattern, year
 * range, currency) are controller-owned lib validators — optional, so a blank
 * field still saves, but a malformed non-blank value is caught. */
export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/your-vehicle/template`
const MAKES = ['Audi', 'BMW', 'Ford', 'Nissan', 'Toyota', 'Volkswagen']

const fields = compose(
  vehicleReg('registration'),
  integerInRange('year', { min: 1900, max: 2100 }),
  currency('estimatedValue')
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Your vehicle', { backLink: hubPath() }),
    heading: 'Your vehicle',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    makes: MAKES
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    registration: answers.registration ?? '',
    make: answers.make ?? '',
    model: answers.model ?? '',
    year: answers.year ?? '',
    estimatedValue: answers.estimatedValue ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    registration: (payload.registration ?? '').trim(),
    make: (payload.make ?? '').trim(),
    model: (payload.model ?? '').trim(),
    year: (payload.year ?? '').trim(),
    estimatedValue: (payload.estimatedValue ?? '').trim()
  }
  const { value: clean, errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, {
    ...values,
    estimatedValue: clean.estimatedValue ?? ''
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
