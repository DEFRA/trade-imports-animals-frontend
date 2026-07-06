import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  oneOf,
  postcode,
  requiredText,
  ukPhone,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { aboutYouPage as page } from './page.js'
import { obligations } from './obligations.js'

/**
 * About you — the ONE page with a save-blocking (hard) mandate: fullName.
 * Every other field saves blank (soft), so "progresses with only Full name"
 * holds. This controller OWNS its validation: it composes a schema from the
 * reusable lib validators and runs it against the payload. fullName is the
 * sole `requiredText`; everything else is optional (blank passes, malformed
 * fails). The state layer only stores — it never sees the schema.
 */
export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/about-you/template`

const COUNTRIES = [
  { value: 'england', text: 'England' },
  { value: 'scotland', text: 'Scotland' },
  { value: 'wales', text: 'Wales' },
  { value: 'northern-ireland', text: 'Northern Ireland' }
]

// The page's field→validator map — assembled from lib pieces, owned here.
const fields = compose(
  requiredText('fullName', 'Enter your full name'),
  ukPhone('phone'),
  postcode('postcode'),
  oneOf(
    'country',
    COUNTRIES.map((c) => c.value)
  ),
  dateParts('dateOfBirth')
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('About you', { backLink: hubPath() }),
    heading: 'About you',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countries: COUNTRIES.map((c) => ({
      ...c,
      selected: c.value === values.country
    })),
    dob: kit.dateField('dateOfBirth', {
      label: 'Date of birth',
      hint: 'For example, 27 3 1985',
      value: values.dateOfBirth ?? {},
      error: errors.dateOfBirth
    })
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    fullName: answers.fullName ?? '',
    preferredName: answers.preferredName ?? '',
    phone: answers.phone ?? '',
    postcode: answers.postcode ?? '',
    country: answers.country ?? '',
    dateOfBirth: answers.dateOfBirth ?? {}
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    fullName: (payload.fullName ?? '').trim(),
    preferredName: (payload.preferredName ?? '').trim(),
    phone: (payload.phone ?? '').trim(),
    postcode: (payload.postcode ?? '').trim(),
    country: payload.country ?? '',
    dateOfBirth: kit.readDate(payload, 'dateOfBirth')
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
