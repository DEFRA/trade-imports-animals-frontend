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

const HTTP_STATUS_BAD_REQUEST = 400

const REGION_CODE_MAX_LENGTH = 5
const INTERNAL_REFERENCE_MAX_LENGTH = 58

const FIELD_ORDER = [
  'countryOfOrigin',
  'regionOfOriginCodeRequirement',
  'regionOfOriginCode',
  'internalReferenceNumber'
]

const valuesFrom = (source, { trim = [] } = {}) =>
  Object.fromEntries(
    FIELD_ORDER.map((field) => [
      field,
      trim.includes(field)
        ? (source[field] ?? '').trim()
        : (source[field] ?? '')
    ])
  )

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
    maxText(
      'regionOfOriginCode',
      REGION_CODE_MAX_LENGTH,
      copy.errors.regionCodeMaxLength
    ),
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    ),
    pattern(
      'internalReferenceNumber',
      /^[a-zA-Z0-9_]*$/,
      copy.errors.internalReferencePattern
    )
  )

const journeyIfStarted = (journey, answers) =>
  hasCommittedNotificationAnswers(answers) ? journey : undefined

const render = (
  h,
  journey,
  values,
  errors = {},
  answers = values,
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey: journeyIfStarted(journey, answers),
      journeyId: journey.journeyId,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers), {}, answers)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = valuesFrom(payload, {
    trim: ['regionOfOriginCode', 'internalReferenceNumber']
  })
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey, answers } = await state.get(request, h)
    return render(h, journey, values, errors, answers).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const failure = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, values)
    },
    async () => {
      const { journey, answers } = await state.get(request, h)
      return render(h, journey, values, {}, answers, true).code(500)
    }
  )
  if (failure) return failure

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
