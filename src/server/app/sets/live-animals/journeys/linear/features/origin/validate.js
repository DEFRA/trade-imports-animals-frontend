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

// The country part of the region of origin code is filled in for the user as a
// fixed prefix, so the form asks only for the part after it. The answer stored
// stays the whole code, joined here, and nothing downstream sees two fields.
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

// A country that has closed on the reference data is not a mistake the trader
// made: it was good when they answered. The rule broken is the same one
// either way, so only what it says about the answer changes.
const countryMessage = (stored) =>
  stored ? copy.errors.countryNoLongerAvailable : copy.errors.countryFromList

// The code is only asked for when the user says the consignment has one, so
// the box is required under Yes and left alone under No. The obligation behind
// the answer says the same thing, and would stop the notification later; the
// rule here is what tells the user at the point of the mistake.
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

// The country does not block the save. A user who has the internal reference
// but is still waiting on the health certificate to confirm where the animal
// comes from can record what they know and come back to it. Membership of the
// list still holds, so a submitted value that is not a country is refused.
// The obligation behind the answer keeps it mandatory, so the unanswered
// country still shows the origin task as unfinished on the hub and still
// stops the notification at the check page.
const fields = async (values, { stored } = {}) => {
  const countryValues = (await countries.originCountries()).map(
    ({ value }) => value
  )
  return compose(
    oneOf('countryOfOrigin', countryValues, countryMessage(stored)),
    oneOf('regionOfOriginCodeRequirement', REGION_CODE_REQUIREMENT_ANSWERS),
    regionCodeSuffixRule(values.regionOfOriginCodeRequirement),
    // The reference is the user's own, and the service never reads it: a
    // reference their records write as ACME-2026/01, or with a space in it,
    // has to go in as they hold it. So nothing rules on the characters — only
    // the length, and the hint says the limit before the user meets it.
    maxText(
      'internalReferenceNumber',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    )
  )
}

// The rules measure the code the answer would store, not the raw box: a user
// who types the country prefix themselves has it stripped before the answer is
// committed, so a box holding nothing but the prefix is an empty code. `values`
// itself keeps the raw typed text — it is what `render` shows back.
const normalise = (values) => ({
  ...values,
  [REGION_CODE_SUFFIX_FIELD]: suffixOf(
    prefixFor(values.countryOfOrigin),
    values[REGION_CODE_SUFFIX_FIELD]
  )
})

// Blank the suffix too when the country is rejected: its prefix mechanic
// depends on the country still matching, so a stale country lets the whole
// stored code cascade into a 5-char field.
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
