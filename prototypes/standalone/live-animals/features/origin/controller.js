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
import { copyFor } from '../../shared/copy.js'
import * as countries from '../../services/countries/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber'
  ]
}
const view = `${TEMPLATES}/features/origin/template`

const copy = copyFor({ en, cy })

const countryItems = () => [
  { value: '', text: copy.country.placeholder },
  { value: '', text: '──────────', disabled: true },
  ...countries.originCountries()
]

const fields = () =>
  compose(
    requiredOneOf(
      'countryOfOrigin',
      countries.originCountries().map(({ value }) => value),
      copy.errors.countryRequired
    ),
    oneOf('regionOfOriginCodeRequirement', ['yes', 'no']),
    maxText('regionOfOriginCode', 5, copy.errors.regionCodeMaxLength),
    maxText(
      'internalReferenceNumber',
      58,
      copy.errors.internalReferenceMaxLength
    ),
    pattern(
      'internalReferenceNumber',
      /^[a-zA-Z0-9]*$/,
      copy.errors.internalReferencePattern
    )
  )

const journeyIfStarted = (journey) =>
  hasCommittedNotificationAnswers(journey.answers) ? journey : undefined

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(),
      journey: journeyIfStarted(journey)
    }),
    copy,
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
