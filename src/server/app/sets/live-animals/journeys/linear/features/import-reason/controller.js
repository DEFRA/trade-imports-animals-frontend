import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
  requiredDateText,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import * as importReasonPurpose from '../../../../../../services/import-reason-purpose/index.js'
import * as ports from '../../../../../../services/ports/index.js'
import { importReasonPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = {
  ...page,
  collects: [
    'reasonForImport',
    'purposeInInternalMarket',
    'destinationCountry',
    'portOfExit',
    'exitDate'
  ]
}
const view = `${TEMPLATES}/features/import-reason/template`

const copy = copyFor({ en, cy })

const PURPOSE_FIELD = 'purposeInInternalMarket'
const TRANSHIPMENT_COUNTRY_FIELD = 'transhipmentDestinationCountry'
const TRANSIT_COUNTRY_FIELD = 'transitDestinationCountry'
const TRANSIT_PORT_FIELD = 'transitPortOfExit'
const TEMPORARY_ADMISSION_PORT_FIELD = 'temporaryAdmissionPortOfExit'
const TEMPORARY_ADMISSION_DATE_FIELD = 'temporaryAdmissionExitDate'

// The follow-up questions each reason opens as a conditional reveal, in the
// order the reveal asks them. Two reasons ask the destination country and two
// ask the port of exit, and two inputs cannot share a name, so each branch
// carries its own form field and maps back to the one answer behind it — the
// same split the origin page makes between `regionOfOriginCodeSuffix` and the
// `regionOfOriginCode` it stores. Which of the four answers is in scope stays
// the obligations' call (obligations/sections/import-reason.js); this says
// only where the question is asked.
const REVEALS = Object.freeze({
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

const revealsFor = (reasonForImport) =>
  Object.hasOwn(REVEALS, reasonForImport) ? REVEALS[reasonForImport] : []

const countryRule = (field) =>
  requiredOneOf(
    field,
    countries.originCountries().map(({ value }) => value),
    copy.errors.countryRequired
  )

const portRule = (field) =>
  requiredOneOf(
    field,
    ports.list().map((port) => port.code),
    copy.errors.portRequired
  )

// The reason radio itself is optional to proceed — Design release 1 says so in
// its own words — but the questions a chosen reason reveals are enforced here,
// not left to the submit. The purpose, both destination countries, both ports
// of exit and the exit date are all required, and the exit date is told apart
// twice over: blank asks for one, unreadable says it is not a real date.
const RULES = Object.freeze({
  [PURPOSE_FIELD]: () =>
    requiredOneOf(
      PURPOSE_FIELD,
      importReasonPurpose.purposes().map((option) => option.value),
      copy.errors.purposeRequired
    ),
  [TRANSHIPMENT_COUNTRY_FIELD]: () => countryRule(TRANSHIPMENT_COUNTRY_FIELD),
  [TRANSIT_COUNTRY_FIELD]: () => countryRule(TRANSIT_COUNTRY_FIELD),
  [TRANSIT_PORT_FIELD]: () => portRule(TRANSIT_PORT_FIELD),
  [TEMPORARY_ADMISSION_PORT_FIELD]: () =>
    portRule(TEMPORARY_ADMISSION_PORT_FIELD),
  [TEMPORARY_ADMISSION_DATE_FIELD]: () =>
    requiredDateText(TEMPORARY_ADMISSION_DATE_FIELD, {
      required: copy.errors.dateRequired,
      invalid: copy.errors.dateInvalid
    })
})

// Only the reveal the submitted reason opens is answerable, so only its
// fields are measured. A field belonging to another branch arrives empty and
// is neither validated nor committed.
const fields = (reasonForImport) =>
  compose(
    oneOf(
      'reasonForImport',
      importReasonPurpose.reasons().map((option) => option.value)
    ),
    ...revealsFor(reasonForImport).map((reveal) => RULES[reveal.field]())
  )

const formValuesFrom = (payload) => ({
  reasonForImport: payload.reasonForImport ?? '',
  [PURPOSE_FIELD]: payload[PURPOSE_FIELD] ?? '',
  [TRANSHIPMENT_COUNTRY_FIELD]: payload[TRANSHIPMENT_COUNTRY_FIELD] ?? '',
  [TRANSIT_COUNTRY_FIELD]: payload[TRANSIT_COUNTRY_FIELD] ?? '',
  [TRANSIT_PORT_FIELD]: payload[TRANSIT_PORT_FIELD] ?? '',
  [TEMPORARY_ADMISSION_PORT_FIELD]:
    payload[TEMPORARY_ADMISSION_PORT_FIELD] ?? '',
  [TEMPORARY_ADMISSION_DATE_FIELD]: kit.readDate(
    payload,
    TEMPORARY_ADMISSION_DATE_FIELD
  )
})

// A stored answer prefills every branch that asks for it, so switching between
// two reasons that share a question keeps the answer in front of the user.
const formValuesFromAnswers = (answers) => ({
  reasonForImport: answers.reasonForImport ?? '',
  [PURPOSE_FIELD]: answers.purposeInInternalMarket ?? '',
  [TRANSHIPMENT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_COUNTRY_FIELD]: answers.destinationCountry ?? '',
  [TRANSIT_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_PORT_FIELD]: answers.portOfExit ?? '',
  [TEMPORARY_ADMISSION_DATE_FIELD]: answers.exitDate ?? {}
})

// The reason and the answers its own reveal collected. An answer belonging to
// a reason no longer chosen is left out and the evaluator purges it, so a
// flip never carries a stale answer forward.
const answersFrom = (values) => ({
  reasonForImport: values.reasonForImport,
  ...Object.fromEntries(
    revealsFor(values.reasonForImport).map(({ field, answer }) => [
      answer,
      values[field]
    ])
  )
})

const DIVIDER_OPTION = { value: '', text: '──────────', disabled: true }

const countryItems = () => [
  { value: '', text: copy.country.placeholder },
  DIVIDER_OPTION,
  ...countries.originCountries()
]

const portItems = () => [
  { value: '', text: copy.port.placeholder },
  DIVIDER_OPTION,
  ...ports.list().map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`
  }))
]

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    reasonOptions: importReasonPurpose.reasons().map((option) => ({
      ...option,
      hint: { text: copy.reasonHints[option.value] },
      checked: option.value === values.reasonForImport
    })),
    purposeOptions: importReasonPurpose.purposes().map((option) => ({
      ...option,
      hint: { text: copy.purpose.hints[option.value] },
      checked: option.value === values[PURPOSE_FIELD]
    })),
    countryItems: countryItems(),
    portItems: portItems(),
    exitDateField: kit.dateField(TEMPORARY_ADMISSION_DATE_FIELD, {
      label: copy.date.label,
      hint: copy.date.hint,
      value: values[TEMPORARY_ADMISSION_DATE_FIELD],
      error: errors[TEMPORARY_ADMISSION_DATE_FIELD]
    })
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, formValuesFromAnswers(answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = formValuesFrom(payload)
  const { errors } = validate(fields(values.reasonForImport), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answersFrom(values))
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, values, {}, true).code(
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
