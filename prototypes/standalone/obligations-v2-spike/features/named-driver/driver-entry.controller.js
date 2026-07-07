import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  oneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'

/**
 * Driver entry — the add sub-page for the OUTER loop. Like the claims entry, a
 * valid POST APPENDS and thereby MINTS the driver's identity (drivers,
 * arrayIndex); the draft lives only in the payload until then. driverName is
 * soft (blank saves — only fullName is save-blocking anywhere); driverDob
 * carries the optional date-parts validator; relationship is a controller-owned
 * value domain. On success we hand off to the new driver's detail page, where
 * its nested claims sub-hub lives.
 */
export const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', text: 'Spouse or partner' },
  { value: 'child', text: 'Son or daughter' },
  { value: 'parent', text: 'Parent' },
  { value: 'other', text: 'Someone else' }
]

const view = `${TEMPLATES}/features/named-driver/driver-entry`

const fields = compose(
  dateParts('driverDob'),
  oneOf(
    'relationship',
    RELATIONSHIP_OPTIONS.map((option) => option.value)
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Add a named driver', {
      backLink: pagePath('addons/named-driver')
    }),
    heading: 'Add a named driver',
    buttonText: 'Save and continue',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    dob: kit.dateField('driverDob', {
      label: 'Date of birth',
      hint: 'For example, 27 3 1985',
      value: values.driverDob ?? {},
      error: errors['driverDob-day']
    }),
    options: RELATIONSHIP_OPTIONS.map((option) => ({
      ...option,
      checked: option.value === values.relationship
    }))
  })

const getAdd = (request, h) => {
  state.get(request, h)
  return render(h, { driverName: '', driverDob: {}, relationship: '' })
}

const postAdd = (request, h) => {
  const payload = request.payload ?? {}
  const entry = {
    driverName: (payload.driverName ?? '').trim(),
    driverDob: kit.readDate(payload, 'driverDob'),
    relationship: payload.relationship ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, entry, errors)

  const index = state.appendEntry(request, h, 'drivers', entry) // MINTS the index
  return h.redirect(pagePath(`addons/named-driver/${index}`))
}

export const routes = [
  {
    method: 'GET',
    path: pagePath('addons/named-driver/add'),
    options: open,
    handler: getAdd
  },
  {
    method: 'POST',
    path: pagePath('addons/named-driver/add'),
    options: open,
    handler: postAdd
  }
]
