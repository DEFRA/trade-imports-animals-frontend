import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { COUNTRY_OF_ORIGIN_LABEL } from '../origin/controller.js'
import { transportDetailsPage as page } from './page.js'
import {
  meansOfTransport,
  transitedCountries,
  transportDocumentReference,
  transportIdentification
} from './obligations.js'

// Explicit subset: the transport feature splits its obligations across the
// port-of-entry and transport-details pages.
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

/** V4 four-value means-of-transport enum (provisional page, c-012). The
 *  stored value is the V4 label itself — transitedCountries' activation
 *  rule references 'Railway' and 'Road Vehicle' verbatim. */
export const MEANS_OF_TRANSPORT = [
  'Airplane',
  'Railway',
  'Road Vehicle',
  'Vessel'
]

/** The activating subset — the template reveals the transited-countries
 *  checkboxes under exactly these radios. */
export const OVERLAND_MEANS = ['Railway', 'Road Vehicle']

export const MAX_TRANSITED_COUNTRIES = 12

// Vendored stand-in for the reference-data country list (V4 valuesSource:
// "Country list") — the same MDM subset the origin page uses.
const countryOptions = (selected) =>
  Object.entries(COUNTRY_OF_ORIGIN_LABEL).map(([value, text]) => ({
    value,
    text,
    checked: selected.includes(value)
  }))

// Every field is enforcedAt=submit: blank passes validation and the required
// obligations stay open requirements for the status roll-up. Only an
// out-of-domain means, an over-length reference or an out-of-domain /
// over-limit country selection blocks the save.
const fields = compose(
  oneOf('meansOfTransport', MEANS_OF_TRANSPORT),
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

// Checkbox-array checks the Joi text validators cannot express: domain
// membership and the V4 maxSelections cap of 12.
const transitedCountriesErrors = (selected) => {
  if (selected.some((code) => !(code in COUNTRY_OF_ORIGIN_LABEL))) {
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

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? '',
    transitedCountries: [].concat(answers.transitedCountries ?? [])
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  // The rail and road radios repeat the countries checkboxes (the design
  // system's repeated-conditional pattern), so the hidden twin group can
  // resubmit the same codes — dedupe with a Set.
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

  // Committing transitedCountries alongside its activating answer is safe:
  // when the means is not rail or road, reconcile wipes it on the same commit.
  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
