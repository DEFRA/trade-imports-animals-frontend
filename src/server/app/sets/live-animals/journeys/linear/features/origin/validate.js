import {
  compose,
  maxText,
  oneOf,
  pageValidation,
  requiredMaxText
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import {
  countryAndSubdivisionOptionsNamedWithCountry,
  isSubdivisionCode,
  parentCountryCode
} from '../../../../../../services/countries/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const REGION_CODE_SUFFIX_MAX_LENGTH = 5
const INTERNAL_REFERENCE_MAX_LENGTH = 58

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
  parentCountryCode((countryOfOrigin ?? '').trim()).toUpperCase()

const normalisedSuffixOf = (prefix, code) => {
  const value = (code ?? '').trim().toUpperCase()
  return prefix && value.startsWith(`${prefix}${REGION_CODE_SEPARATOR}`)
    ? value.slice(prefix.length + REGION_CODE_SEPARATOR.length)
    : value
}

const regionCodeFrom = ({
  countryOfOrigin,
  regionOfOriginCodeRequirement,
  [REGION_CODE_SUFFIX_FIELD]: suffix
}) => {
  const prefix = prefixFor(countryOfOrigin)
  const rest = normalisedSuffixOf(prefix, suffix)
  if (
    regionOfOriginCodeRequirement !== REGION_CODE_REQUIRED_ANSWER ||
    !prefix ||
    !rest
  ) {
    return ''
  }
  return `${prefix}${REGION_CODE_SEPARATOR}${rest}`
}

const countryMessage = (stored) =>
  stored ? copy.errors.countryNoLongerAvailable : copy.errors.countryFromList

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

const fields = async (values, { stored } = {}) => {
  const countryValues = (
    await countryAndSubdivisionOptionsNamedWithCountry()
  ).map(({ value }) => value)
  return compose(
    oneOf('countryOfOrigin', countryValues, countryMessage(stored)),
    oneOf('regionOfOriginCodeRequirement', REGION_CODE_REQUIREMENT_ANSWERS),
    regionCodeSuffixRule(values.regionOfOriginCodeRequirement),
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    )
  )
}

const normalise = (values) => ({
  ...values,
  [REGION_CODE_SUFFIX_FIELD]: normalisedSuffixOf(
    prefixFor(values.countryOfOrigin),
    values[REGION_CODE_SUFFIX_FIELD]
  )
})

const fieldsToBlankWhenChanged = (field) =>
  field === 'countryOfOrigin'
    ? [
        'countryOfOrigin',
        'countryOfOriginSubdivisionCode',
        REGION_CODE_SUFFIX_FIELD
      ]
    : [field]

export const validation = pageValidation({
  fields,
  normalise,
  fromPayload: formValuesFrom,
  fromAnswers: (answers) => ({
    countryOfOrigin:
      answers.countryOfOriginSubdivisionCode || answers.countryOfOrigin || '',
    regionOfOriginCodeRequirement: answers.regionOfOriginCodeRequirement ?? '',
    [REGION_CODE_SUFFIX_FIELD]: normalisedSuffixOf(
      prefixFor(answers.countryOfOrigin),
      answers.regionOfOriginCode
    ),
    internalReferenceNumber: answers.internalReferenceNumber ?? ''
  }),
  blanks: fieldsToBlankWhenChanged,
  toAnswers: (values) => ({
    countryOfOrigin: values.countryOfOrigin,
    countryOfOriginSubdivisionCode: isSubdivisionCode(values.countryOfOrigin)
      ? values.countryOfOrigin
      : '',
    regionOfOriginCodeRequirement: values.regionOfOriginCodeRequirement,
    regionOfOriginCode: regionCodeFrom(values),
    internalReferenceNumber: values.internalReferenceNumber
  })
})
