import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/**
 * About you — the ONE page with a save-blocking (hard) mandate: fullName.
 * Every other field saves blank (soft), so "progresses with only Full name"
 * holds. Bespoke validation lives right here; the state layer only stores.
 */
const page = { id: 'about-you', slug: 'about-you' }
export const meta = {
  ...page,
  collects: [
    'fullName',
    'preferredName',
    'phone',
    'postcode',
    'country',
    'dateOfBirth'
  ]
}
const view = `${TEMPLATES}/pages/about-you/template`

const COUNTRIES = [
  { value: 'england', text: 'England' },
  { value: 'scotland', text: 'Scotland' },
  { value: 'wales', text: 'Wales' },
  { value: 'northern-ireland', text: 'Northern Ireland' }
]

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
  const errors = {}
  if (!values.fullName) errors.fullName = 'Enter your full name' // the sole hard mandate
  if (Object.keys(errors).length) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
