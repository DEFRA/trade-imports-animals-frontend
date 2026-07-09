import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as transportReference from '../../services/transport-reference/index.js'
import * as countries from '../../services/countries/index.js'
import { transportDetailsPage as page } from './page.js'
import {
  meansOfTransport,
  transitedCountries,
  transportDocumentReference,
  transportIdentification
} from './obligations.js'

export const meta = {
  ...page,
  collects: [
    meansOfTransport.id,
    transportIdentification.id,
    transportDocumentReference.id,
    transitedCountries.id
  ]
}
const view = `${TEMPLATES}/features/transport/transport-details`

export const MAX_TRANSITED_COUNTRIES = 12

const countryOptions = (selected) =>
  countries.originCountries().map(({ value, text }) => ({
    value,
    text,
    checked: selected.includes(value)
  }))

const fields = compose(
  oneOf('meansOfTransport', transportReference.meansOfTransport()),
  maxText(
    'transportIdentification',
    58,
    'Transport identification must be 58 characters or less'
  ),
  maxText(
    'transportDocumentReference',
    58,
    'Transport document reference must be 58 characters or less'
  )
)

const transitedCountriesErrors = (selected) => {
  if (selected.some((code) => countries.originLabel(code) === undefined)) {
    return { transitedCountries: 'Select countries from the list' }
  }
  if (selected.length > MAX_TRANSITED_COUNTRIES) {
    return {
      transitedCountries: `Select up to ${MAX_TRANSITED_COUNTRIES} countries`
    }
  }
  return {}
}

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('How the animals will travel', { backLink: hubPath() }),
    heading: 'How the animals will travel',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryOptions: countryOptions(values.transitedCountries)
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, {
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? '',
    transitedCountries: [].concat(answers.transitedCountries ?? [])
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    meansOfTransport: payload.meansOfTransport ?? '',
    transportIdentification: (payload.transportIdentification ?? '').trim(),
    transportDocumentReference: (
      payload.transportDocumentReference ?? ''
    ).trim(),
    transitedCountries: [
      ...new Set([].concat(payload.transitedCountries ?? []))
    ]
  }
  const { errors } = validate(fields, payload)
  const allErrors = {
    ...(errors ?? {}),
    ...transitedCountriesErrors(values.transitedCountries)
  }
  if (Object.keys(allErrors).length > 0) return render(h, values, allErrors)

  const { scope } = await state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
