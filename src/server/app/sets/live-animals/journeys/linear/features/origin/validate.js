import {
  compose,
  maxText,
  oneOf,
  pageValidation,
  requiredMaxText
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const REGION_CODE_SUFFIX_MAX_LENGTH = 5
const INTERNAL_REFERENCE_MAX_LENGTH = 58

// Country is a fixed prefix on the form; the trader only types the part after
// it. The stored answer is the whole joined code — nothing downstream sees
// two fields.
export const REGION_CODE_SUFFIX_FIELD = 'regionOfOriginCodeSuffix'
const REGION_CODE_SEPARATOR = '-'
const REGION_CODE_REQUIRED_ANSWER = 'yes'
const REGION_CODE_NOT_REQUIRED_ANSWER = 'no'
const REGION_CODE_REQUIREMENT_ANSWERS = [
  REGION_CODE_REQUIRED_ANSWER,
  REGION_CODE_NOT_REQUIRED_ANSWER
]

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

export const prefixFor = (countryOfOrigin) =>
  (countryOfOrigin ?? '').trim().toUpperCase()

// Also forgives a user who typed the prefix themselves.
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

const countryMessage = (stored) =>
  stored ? copy.errors.countryNoLongerAvailable : copy.errors.countryFromList

// Required under Yes, left alone under No. The obligation would stop the
// notification later either way; the rule here tells the user in-page.
const regionCodeSuffixRule = (requirement) =>
  requirement === REGION_CODE_REQUIRED_ANSWER
    ? requiredMaxText(REGION_CODE_SUFFIX_FIELD, REGION_CODE_SUFFIX_MAX_LENGTH, {
        required: copy.errors.regionCodeRequired,
        maxLength: copy.errors.regionCodeMaxLength
      })
    : maxText(
        REGION_CODE_SUFFIX_FIELD,
        REGION_CODE_SUFFIX_MAX_LENGTH,
        copy.errors.regionCodeMaxLength
      )

// Membership only, not required — the obligation model requires the country
// separately, so a user waiting on paperwork can save what they know and
// come back.
const fields = async (values, { stored } = {}) => {
  const countryValues = (await countries.originCountries()).map(
    ({ value }) => value
  )
  return compose(
    oneOf('countryOfOrigin', countryValues, countryMessage(stored)),
    oneOf('regionOfOriginCodeRequirement', REGION_CODE_REQUIREMENT_ANSWERS),
    regionCodeSuffixRule(values.regionOfOriginCodeRequirement),
    // The reference is the user's own; the service never reads it. Length
    // only — no character rules.
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    )
  )
}

// Rules measure the storable code, not the raw box — a box holding only the
// prefix is an empty code. `values` keeps the raw text `render` shows back.
const normalise = (values) => ({
  ...values,
  [REGION_CODE_SUFFIX_FIELD]: suffixOf(
    prefixFor(values.countryOfOrigin),
    values[REGION_CODE_SUFFIX_FIELD]
  )
})

// Blank the suffix with the country — its prefix mechanic depends on the
// country still matching, or the whole stored code cascades into a 5-char field.
const blanks = (field) =>
  field === 'countryOfOrigin'
    ? ['countryOfOrigin', REGION_CODE_SUFFIX_FIELD]
    : [field]

export const validation = pageValidation({
  fields,
  normalise,
  fromPayload: formValuesFrom,
  fromAnswers: (answers) => ({
    countryOfOrigin: answers.countryOfOrigin ?? '',
    regionOfOriginCodeRequirement: answers.regionOfOriginCodeRequirement ?? '',
    [REGION_CODE_SUFFIX_FIELD]: suffixOf(
      prefixFor(answers.countryOfOrigin),
      answers.regionOfOriginCode
    ),
    internalReferenceNumber: answers.internalReferenceNumber ?? ''
  }),
  blanks,
  toAnswers: (values) => ({
    countryOfOrigin: values.countryOfOrigin,
    regionOfOriginCodeRequirement: values.regionOfOriginCodeRequirement,
    regionOfOriginCode: regionCodeFrom(
      values.countryOfOrigin,
      values[REGION_CODE_SUFFIX_FIELD]
    ),
    internalReferenceNumber: values.internalReferenceNumber
  })
})
