import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, dateParts, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'

/** Named driver — who (first page of the gated named-driver section).
 * driverName saves blank (soft — only fullName is save-blocking); driverDob
 * carries the optional date-parts validator. */
const page = { id: 'named-driver-who', slug: 'addons/named-driver/who' }
export const meta = { ...page, collects: ['driverName', 'driverDob'] }
const view = `${TEMPLATES}/features/named-driver/who`

const fields = compose(dateParts('driverDob'))

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Named driver', { backLink: hubPath() }),
    heading: 'Named driver',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    dob: kit.dateField('driverDob', {
      label: 'Date of birth',
      hint: 'For example, 27 3 1985',
      value: values.driverDob ?? {},
      error: errors['driverDob-day']
    })
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    driverName: answers.driverName ?? '',
    driverDob: answers.driverDob ?? {}
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    driverName: (payload.driverName ?? '').trim(),
    driverDob: kit.readDate(payload, 'driverDob')
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
