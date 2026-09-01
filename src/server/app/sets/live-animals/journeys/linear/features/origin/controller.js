import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  maxText,
  oneOf,
  pattern,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

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

const REGION_CODE_SUFFIX_MAX_LENGTH = 5
const INTERNAL_REFERENCE_MAX_LENGTH = 58

// The country part of the region of origin code is filled in for the user as a
// fixed prefix, so the form asks only for the part after it. The answer stored
// stays the whole code, joined here, and nothing downstream sees two fields.
const REGION_CODE_SUFFIX_FIELD = 'regionOfOriginCodeSuffix'
const REGION_CODE_SEPARATOR = '-'

const FORM_FIELD_ORDER = [
  'countryOfOrigin',
  'regionOfOriginCodeRequirement',
  REGION_CODE_SUFFIX_FIELD,
  'internalReferenceNumber'
]

const TRIMMED_FORM_FIELDS = [
  REGION_CODE_SUFFIX_FIELD,
  'internalReferenceNumber'
]

const formValuesFrom = (source) =>
  Object.fromEntries(
    FORM_FIELD_ORDER.map((field) => [
      field,
      TRIMMED_FORM_FIELDS.includes(field)
        ? (source[field] ?? '').trim()
        : (source[field] ?? '')
    ])
  )

const prefixFor = (countryOfOrigin) =>
  (countryOfOrigin ?? '').trim().toUpperCase()

// Splitting a whole code back into the part after the prefix. Used to redisplay
// a stored answer, and to forgive a user who typed the prefix themselves.
const suffixOf = (prefix, code) => {
  const value = (code ?? '').trim().toUpperCase()
  return prefix && value.startsWith(`${prefix}${REGION_CODE_SEPARATOR}`)
    ? value.slice(prefix.length + REGION_CODE_SEPARATOR.length)
    : value
}

const regionCodeFrom = (countryOfOrigin, suffix) => {
  const prefix = prefixFor(countryOfOrigin)
  const rest = suffixOf(prefix, suffix)
  if (!rest) {
    return ''
  }
  return prefix ? `${prefix}${REGION_CODE_SEPARATOR}${rest}` : rest
}

const answersFrom = (formValues) => ({
  countryOfOrigin: formValues.countryOfOrigin,
  regionOfOriginCodeRequirement: formValues.regionOfOriginCodeRequirement,
  regionOfOriginCode: regionCodeFrom(
    formValues.countryOfOrigin,
    formValues[REGION_CODE_SUFFIX_FIELD]
  ),
  internalReferenceNumber: formValues.internalReferenceNumber
})

const formValuesFromAnswers = (answers) => ({
  countryOfOrigin: answers.countryOfOrigin ?? '',
  regionOfOriginCodeRequirement: answers.regionOfOriginCodeRequirement ?? '',
  [REGION_CODE_SUFFIX_FIELD]: suffixOf(
    prefixFor(answers.countryOfOrigin),
    answers.regionOfOriginCode
  ),
  internalReferenceNumber: answers.internalReferenceNumber ?? ''
})

// The list feeds a type-ahead that enhances this select, so it carries only the
// placeholder and the real countries — a scroll-only list needed a divider rule
// under the placeholder, a searchable one does not.
const countryItems = () => [
  { value: '', text: copy.country.placeholder },
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
      REGION_CODE_SUFFIX_FIELD,
      REGION_CODE_SUFFIX_MAX_LENGTH,
      copy.errors.regionCodeMaxLength
    ),
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    ),
    pattern(
      'internalReferenceNumber',
      /^\w*$/,
      copy.errors.internalReferencePattern
    )
  )

const journeyIfStarted = (journey, answers) =>
  hasCommittedNotificationAnswers(answers) ? journey : undefined

const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

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
      backLink: backLinkFor(journey, answers),
      journey: journeyIfStarted(journey, answers),
      journeyId: journey.journeyId,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems(),
    regionCodePrefix: prefixFor(values.countryOfOrigin)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, formValuesFromAnswers(answers), {}, answers)
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = formValuesFrom(payload)
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey, answers } = await state.get(request, h)
    return render(h, journey, values, errors, answers).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answersFrom(values))
    },
    async () => {
      const { journey, answers } = await state.get(request, h)
      return render(h, journey, values, {}, answers, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
