import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  maxText,
  oneOf,
  pattern,
  requiredOneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as countries from '../../services/countries/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { originPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/origin/template`

const countryItems = () => [
  { value: '', text: 'Select a country' },
  { value: '', text: '──────────', disabled: true },
  ...countries.originCountries()
]

const fields = () =>
  compose(
    requiredOneOf(
      'countryOfOrigin',
      countries.originCountries().map(({ value }) => value),
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

const journeyIfStarted = (journey) =>
  hasCommittedNotificationAnswers(journey.answers) ? journey : undefined

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Origin of the import', {
      backLink: hubPath(),
      journey: journeyIfStarted(journey)
    }),
    heading: 'Origin of the import',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
    countryOfOrigin: answers.countryOfOrigin ?? '',
    regionOfOriginCodeRequirement: answers.regionOfOriginCodeRequirement ?? '',
    regionOfOriginCode: answers.regionOfOriginCode ?? '',
    internalReferenceNumber: answers.internalReferenceNumber ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    countryOfOrigin: payload.countryOfOrigin ?? '',
    regionOfOriginCodeRequirement: payload.regionOfOriginCodeRequirement ?? '',
    regionOfOriginCode: (payload.regionOfOriginCode ?? '').trim(),
    internalReferenceNumber: (payload.internalReferenceNumber ?? '').trim()
  }
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
