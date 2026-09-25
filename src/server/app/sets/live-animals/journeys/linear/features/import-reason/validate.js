import {
  compose,
  oneOf,
  pageValidation,
  requiredDateText,
  requiredOneOf
} from '../../../../../../lib/validate/index.js'
import { dateTextOf, readDate } from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../services/ports/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const PURPOSE_FIELD = 'purposeInInternalMarket'
export const TRANSHIPMENT_COUNTRY_FIELD = 'transhipmentDestinationCountry'
export const TRANSIT_COUNTRY_FIELD = 'transitDestinationCountry'
export const TRANSIT_PORT_FIELD = 'transitPortOfExit'
export const TEMPORARY_ADMISSION_PORT_FIELD = 'temporaryAdmissionPortOfExit'
export const TEMPORARY_ADMISSION_DATE_FIELD = 'temporaryAdmissionExitDate'

// Reveal-conditional fields. Two reasons ask the destination country and two
// ask the port of exit — form inputs can't share a name, so each branch has
// its own field mapping back to the one answer. In-scope is the obligations'
// call (obligations/sections/import-reason.js); this says only where asked.
export const REVEALS = Object.freeze({
  internalMarket: [{ field: PURPOSE_FIELD, answer: 'purposeInInternalMarket' }],
  transhipmentOrOnwardTravel: [
    { field: TRANSHIPMENT_COUNTRY_FIELD, answer: 'destinationCountry' }
  ],
  transit: [
    { field: TRANSIT_PORT_FIELD, answer: 'portOfExit' },
    { field: TRANSIT_COUNTRY_FIELD, answer: 'destinationCountry' }
  ],
  temporaryAdmissionHorses: [
    { field: TEMPORARY_ADMISSION_DATE_FIELD, answer: 'exitDate' },
    { field: TEMPORARY_ADMISSION_PORT_FIELD, answer: 'portOfExit' }
  ],
  reEntry: []
})

export const revealsFor = (reasonForImport) =>
  Object.hasOwn(REVEALS, reasonForImport) ? REVEALS[reasonForImport] : []

const REVEALED_FIELDS = Object.values(REVEALS).flat()

const ANSWER_OF_FIELD = Object.fromEntries(
  REVEALED_FIELDS.map(({ field, answer }) => [field, answer])
)

const FIELDS_BY_ANSWER = REVEALED_FIELDS.reduce((map, { field, answer }) => {
  map[answer] = [...(map[answer] ?? []), field]
  return map
}, {})

// A stale answer must blank every field that prefills from it, across every
// reveal — otherwise a reveal the trader isn't looking at still offers the
// value the reader no longer recognises.
const fieldsSharingAnswerWith = (field) =>
  FIELDS_BY_ANSWER[ANSWER_OF_FIELD[field]] ?? [field]

const countryRule = async (field, stored) => {
  const codes = (await countries.originCountries()).map(({ value }) => value)
  return stored
    ? oneOf(field, codes, copy.errors.countryNoLongerAvailable)
    : requiredOneOf(field, codes, copy.errors.countryRequired)
}

const portRule = async (field, stored) => {
  const codes = (await ports.list()).map((port) => port.code)
  return stored
    ? oneOf(field, codes, copy.errors.portNoLongerAvailable)
    : requiredOneOf(field, codes, copy.errors.portRequired)
}

// The reason radio itself is optional to proceed (Design release 1); the
// reveal's questions are required on submit. Purpose and exit-date are the
// service's own words rather than reference data, so neither can go stale —
// the stored reading asks nothing of them.
const RULES = Object.freeze({
  [PURPOSE_FIELD]: (stored) =>
    stored
      ? compose()
      : requiredOneOf(
          PURPOSE_FIELD,
          importReasonPurpose.purposes().map((option) => option.value),
          copy.errors.purposeRequired
        ),
  [TRANSHIPMENT_COUNTRY_FIELD]: (stored) =>
    countryRule(TRANSHIPMENT_COUNTRY_FIELD, stored),
  [TRANSIT_COUNTRY_FIELD]: (stored) =>
    countryRule(TRANSIT_COUNTRY_FIELD, stored),
  [TRANSIT_PORT_FIELD]: (stored) => portRule(TRANSIT_PORT_FIELD, stored),
  [TEMPORARY_ADMISSION_PORT_FIELD]: (stored) =>
    portRule(TEMPORARY_ADMISSION_PORT_FIELD, stored),
  [TEMPORARY_ADMISSION_DATE_FIELD]: (stored) =>
    stored
      ? compose()
      : requiredDateText(TEMPORARY_ADMISSION_DATE_FIELD, {
          required: copy.errors.dateRequired,
          invalid: copy.errors.dateInvalid
        })
})

// Only the current reason's reveal is measured; fields from other branches
// arrive empty and are neither validated nor committed.
const fields = async (values, { stored } = {}) =>
  compose(
    oneOf(
      'reasonForImport',
      importReasonPurpose.reasons().map((option) => option.value)
    ),
    ...(await Promise.all(
      revealsFor(values.reasonForImport).map((reveal) =>
        RULES[reveal.field](stored)
      )
    ))
  )

const fromPayload = (payload) => ({
  reasonForImport: payload.reasonForImport ?? '',
  [PURPOSE_FIELD]: payload[PURPOSE_FIELD] ?? '',
  [TRANSHIPMENT_COUNTRY_FIELD]: payload[TRANSHIPMENT_COUNTRY_FIELD] ?? '',
  [TRANSIT_COUNTRY_FIELD]: payload[TRANSIT_COUNTRY_FIELD] ?? '',
  [TRANSIT_PORT_FIELD]: payload[TRANSIT_PORT_FIELD] ?? '',
  [TEMPORARY_ADMISSION_PORT_FIELD]:
    payload[TEMPORARY_ADMISSION_PORT_FIELD] ?? '',
  // Date stays as dd/mm/yyyy text — the shape the rule reads and the field
  // renders. `toAnswers` converts to the `{day,month,year}` object.
  [TEMPORARY_ADMISSION_DATE_FIELD]: String(
    payload[TEMPORARY_ADMISSION_DATE_FIELD] ?? ''
  ).trim()
})

// Prefill every branch, so flipping between reasons that share a question
// keeps the answer in front of the user.
const fromAnswers = (answers) => ({
  reasonForImport: answers.reasonForImport ?? '',
  [PURPOSE_FIELD]: answers.purposeInInternalMarket ?? '',
  [TRANSHIPMENT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_DATE_FIELD]: dateTextOf(answers.exitDate)
})

// Commits only the current reveal's answers; the evaluator purges any
// belonging to a reason no longer chosen.
const toAnswers = (values) => ({
  reasonForImport: values.reasonForImport,
  ...Object.fromEntries(
    revealsFor(values.reasonForImport).map(({ field, answer }) => [
      answer,
      field === TEMPORARY_ADMISSION_DATE_FIELD
        ? readDate(values, field)
        : values[field]
    ])
  )
})

export const validation = pageValidation({
  fields,
  fromPayload,
  fromAnswers,
  toAnswers,
  blanks: fieldsSharingAnswerWith
})
