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

// The follow-up questions each reason opens as a conditional reveal, in the
// order the reveal asks them. Two reasons ask the destination country and two
// ask the port of exit, and two inputs cannot share a name, so each branch
// carries its own form field and maps back to the one answer behind it — the
// same split the origin page makes between `regionOfOriginCodeSuffix` and the
// `regionOfOriginCode` it stores. Which of the four answers is in scope stays
// the obligations' call (obligations/sections/import-reason.js); this says
// only where the question is asked.
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

// Every field — across every reveal, not only the one the current reason
// shows — that stores into the same answer as the given field. Two reveals
// can ask the same question through different fields (`destinationCountry`,
// `portOfExit`), so a stale answer has to blank every field that prefills
// from it, or the reveal the trader isn't looking at would still offer the
// value the reader no longer recognises.
const fieldsSharingAnswerWith = (field) =>
  FIELDS_BY_ANSWER[ANSWER_OF_FIELD[field]] ?? [field]

// A destination country or port of exit is measured the same way whichever
// field asks for it: membership is save-blocking on submit, and on the
// stored reading a blank answer is not yet a mistake — only one that no
// longer resolves against today's reference data is.
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

// The reason radio itself is optional to proceed — Design release 1 says so in
// its own words — but the questions a chosen reason reveals are enforced on
// submit: the purpose, both destination countries, both ports of exit and the
// exit date are all required, and the exit date is told apart twice over:
// blank asks for one, unreadable says it is not a real date. The purpose list
// and the exit date are the service's own words rather than reference data, so
// neither can go stale under a trader's feet — the stored reading asks
// nothing of them.
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

// Only the reveal the submitted or stored reason opens is answerable, so only
// its fields are measured. A field belonging to another branch arrives empty
// and is neither validated nor committed.
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
  // The date rule reads the same dd/mm/yyyy text the field renders, so it
  // stays text here rather than the `{day,month,year}` object `toAnswers`
  // commits.
  [TEMPORARY_ADMISSION_DATE_FIELD]: String(
    payload[TEMPORARY_ADMISSION_DATE_FIELD] ?? ''
  ).trim()
})

// A stored answer prefills every branch that asks for it, so switching between
// two reasons that share a question keeps the answer in front of the user.
const fromAnswers = (answers) => ({
  reasonForImport: answers.reasonForImport ?? '',
  [PURPOSE_FIELD]: answers.purposeInInternalMarket ?? '',
  [TRANSHIPMENT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_DATE_FIELD]: dateTextOf(answers.exitDate)
})

// The reason and the answers its own reveal collected. An answer belonging to
// a reason no longer chosen is left out and the evaluator purges it, so a
// flip never carries a stale answer forward.
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
