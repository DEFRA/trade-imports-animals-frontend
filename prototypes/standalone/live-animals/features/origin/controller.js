import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  maxText,
  oneOf,
  pattern,
  requiredText,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import { originPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/origin/template`

const countryItems = () => [
  { value: '', text: 'Select a country' },
  { text: '──────────', disabled: true },
  ...countries.originCountries()
]

// countryOfOrigin is enforcedAt=continue (spec ruling c-023): blank blocks
// Save and Continue. Every other field here is enforcedAt=submit — blank
// passes validation and the obligation stays an open requirement for the
// status roll-up (In progress, not a validation error).
const fields = compose(
  requiredText(
    'countryOfOrigin',
    'Select the country where the animal originates from'
  ),
  oneOf('regionOfOriginCodeRequirement', ['yes', 'no']),
  maxText(
    'regionOfOriginCode',
    5,
    'Region of origin code must be 5 characters or less'
  ),
  maxText(
    'internalReferenceNumber',
    58,
    'Internal reference must be 58 characters or less'
  ),
  pattern(
    'internalReferenceNumber',
    /^[a-zA-Z0-9]*$/,
    'Internal reference must only contain letters and numbers'
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Origin of the import', { backLink: hubPath() }),
    heading: 'Origin of the import',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    countryOfOrigin: answers.countryOfOrigin ?? '',
    regionOfOriginCodeRequirement: answers.regionOfOriginCodeRequirement ?? '',
    regionOfOriginCode: answers.regionOfOriginCode ?? '',
    internalReferenceNumber: answers.internalReferenceNumber ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    countryOfOrigin: payload.countryOfOrigin ?? '',
    regionOfOriginCodeRequirement: payload.regionOfOriginCodeRequirement ?? '',
    regionOfOriginCode: (payload.regionOfOriginCode ?? '').trim(),
    internalReferenceNumber: (payload.internalReferenceNumber ?? '').trim()
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  // Committing regionOfOriginCode alongside its activating answer is safe:
  // when the requirement is not 'yes', reconcile wipes it on the same commit.
  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
