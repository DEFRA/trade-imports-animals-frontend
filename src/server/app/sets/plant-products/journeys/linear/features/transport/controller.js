import Joi from 'joi'

import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  oneOf,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import {
  controlPointCodesFor,
  controlPointsFor,
  hasControlPoints,
  list as listBcps
} from '../../../../services/reference/bcps.js'
import { meansOfTransportOptions } from '../../../../services/reference/transport-options.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { transportBeforeBipPage as page } from './page.js'

export const meta = {
  ...page,
  collects: [
    'borderControlPost',
    'inspectionPremises',
    'meansOfTransport',
    'transportIdentification',
    'transportDocumentReference',
    'arrivalDate',
    'arrivalTime',
    'usesContainers',
    'containers'
  ]
}

const view = `${TEMPLATES}/features/transport/template`
const copy = copyFor({ en, cy })

const DATE_ERROR_KEY = 'arrivalDate-day'
const TIME_ERROR_KEY = 'arrivalTime-hour'

const ARRIVAL_WINDOW_DAYS = 90
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_PART_COUNT = 3
const TIME_PART_COUNT = 2
const MAX_HOUR = 23
const MAX_MINUTE = 59

const MAX_TRANSPORT_IDENTIFICATION_LENGTH = 50
const MAX_DOCUMENT_REFERENCE_LENGTH = 32
const MAX_CONTAINER_NUMBER_LENGTH = 32
const MAX_SEAL_NUMBER_LENGTH = 100

const startOfUtcDay = (date = new Date()) =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

const dateSchema = () => {
  const today = startOfUtcDay()
  const lastAllowed = today + ARRIVAL_WINDOW_DAYS * MILLISECONDS_PER_DAY
  return Joi.object({
    [DATE_ERROR_KEY]: Joi.any()
      .required()
      .custom((day, helpers) => {
        const source = helpers.state.ancestors[0] ?? {}
        const parts = [
          String(day ?? '').trim(),
          String(source['arrivalDate-month'] ?? '').trim(),
          String(source['arrivalDate-year'] ?? '').trim()
        ]
        const filled = parts.filter(Boolean).length
        if (filled === 0) {
          return helpers.error('date.required')
        }
        if (
          filled !== DATE_PART_COUNT ||
          !parts.every((part) => /^\d+$/.test(part))
        ) {
          return helpers.error('date.real')
        }
        const [parsedDay, parsedMonth, parsedYear] = parts.map(Number)
        const candidate = Date.UTC(parsedYear, parsedMonth - 1, parsedDay)
        const real = new Date(candidate)
        if (
          real.getUTCFullYear() !== parsedYear ||
          real.getUTCMonth() !== parsedMonth - 1 ||
          real.getUTCDate() !== parsedDay
        ) {
          return helpers.error('date.real')
        }
        if (candidate < today || candidate > lastAllowed) {
          return helpers.error('date.window')
        }
        return day
      })
      .messages({
        'any.required': copy.errors.arrivalDateRequired,
        'date.required': copy.errors.arrivalDateRequired,
        'date.real': copy.errors.arrivalDateReal,
        'date.window': copy.errors.arrivalDateWindow
      }),
    'arrivalDate-month': Joi.any(),
    'arrivalDate-year': Joi.any()
  }).unknown(true)
}

const timeSchema = () =>
  Joi.object({
    [TIME_ERROR_KEY]: Joi.any()
      .required()
      .custom((hour, helpers) => {
        const source = helpers.state.ancestors[0] ?? {}
        const parts = [
          String(hour ?? '').trim(),
          String(source['arrivalTime-minute'] ?? '').trim()
        ]
        const filled = parts.filter(Boolean).length
        if (filled === 0) {
          return helpers.error('time.required')
        }
        if (
          filled !== TIME_PART_COUNT ||
          !parts.every((part) => /^\d{1,2}$/.test(part)) ||
          Number(parts[0]) > MAX_HOUR ||
          Number(parts[1]) > MAX_MINUTE
        ) {
          return helpers.error('time.invalid')
        }
        return hour
      })
      .messages({
        'any.required': copy.errors.arrivalTimeRequired,
        'time.required': copy.errors.arrivalTimeRequired,
        'time.invalid': copy.errors.arrivalTimeInvalid
      }),
    'arrivalTime-minute': Joi.any()
  }).unknown(true)

const requiredTextWithMax = (name, max, requiredMessage, maxMessage) =>
  Joi.object({
    [name]: Joi.string().trim().required().max(max).messages({
      'string.empty': requiredMessage,
      'any.required': requiredMessage,
      'string.max': maxMessage
    })
  }).unknown(true)

const pageFields = (postedBcp) => {
  const premises = controlPointCodesFor(postedBcp)
  const premisesRule = premises.length
    ? requiredOneOf(
        'inspectionPremises',
        premises,
        copy.errors.premisesRequired
      )
    : oneOf('inspectionPremises', [], copy.errors.premisesRequired)

  return compose(
    requiredOneOf(
      'borderControlPost',
      listBcps().map(({ value }) => value),
      copy.errors.bcpRequired
    ),
    premisesRule,
    requiredOneOf(
      'meansOfTransport',
      meansOfTransportOptions.map(({ value }) => value),
      copy.errors.meansRequired
    ),
    requiredTextWithMax(
      'transportIdentification',
      MAX_TRANSPORT_IDENTIFICATION_LENGTH,
      copy.errors.identificationRequired,
      copy.errors.identificationMaxLength
    ),
    requiredTextWithMax(
      'transportDocumentReference',
      MAX_DOCUMENT_REFERENCE_LENGTH,
      copy.errors.documentReferenceRequired,
      copy.errors.documentReferenceMaxLength
    ),
    requiredOneOf(
      'usesContainers',
      ['true', 'false'],
      copy.errors.usesContainersRequired
    ),
    dateSchema(),
    timeSchema()
  )
}

const containerFields = () =>
  Joi.object({
    containerNumber: Joi.any()
      .custom((raw, helpers) => {
        const value = String(raw ?? '').trim()
        const seal = String(helpers.state.ancestors[0]?.sealNumber ?? '').trim()
        if (!value && !seal) {
          return helpers.error('container.oneOf')
        }
        if (value.length > MAX_CONTAINER_NUMBER_LENGTH) {
          return helpers.error('container.max')
        }
        return value
      })
      .messages({
        'container.oneOf': copy.errors.containerOrSealRequired,
        'container.max': copy.errors.containerNumberMaxLength
      }),
    sealNumber: Joi.any()
      .custom((raw, helpers) => {
        const value = String(raw ?? '').trim()
        return value.length > MAX_SEAL_NUMBER_LENGTH
          ? helpers.error('seal.max')
          : value
      })
      .messages({ 'seal.max': copy.errors.sealNumberMaxLength })
  }).unknown(true)

const datePartsFrom = (value) => {
  if (value && typeof value === 'object') {
    return {
      day: String(value.day ?? ''),
      month: String(value.month ?? ''),
      year: String(value.year ?? '')
    }
  }
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match
    ? { day: match[3], month: match[2], year: match[1] }
    : { day: '', month: '', year: '' }
}

const timePartsFrom = (value) => {
  if (value && typeof value === 'object') {
    return {
      hour: String(value.hour ?? ''),
      minute: String(value.minute ?? '')
    }
  }
  const match = String(value ?? '').match(/^(\d{2}):(\d{2})$/)
  return match ? { hour: match[1], minute: match[2] } : { hour: '', minute: '' }
}

const valuesFromAnswers = (answers) => ({
  borderControlPost: answers.borderControlPost ?? '',
  inspectionPremises: answers.inspectionPremises ?? '',
  meansOfTransport: answers.meansOfTransport ?? '',
  transportIdentification: answers.transportIdentification ?? '',
  transportDocumentReference: answers.transportDocumentReference ?? '',
  arrivalDate: datePartsFrom(answers.arrivalDate),
  arrivalTime: timePartsFrom(answers.arrivalTime),
  usesContainers: answers.usesContainers
})

const valuesFromPayload = (payload) => ({
  borderControlPost: payload.borderControlPost ?? '',
  inspectionPremises: payload.inspectionPremises ?? '',
  meansOfTransport: payload.meansOfTransport ?? '',
  transportIdentification: payload.transportIdentification ?? '',
  transportDocumentReference: payload.transportDocumentReference ?? '',
  arrivalDate: {
    day: payload['arrivalDate-day'] ?? '',
    month: payload['arrivalDate-month'] ?? '',
    year: payload['arrivalDate-year'] ?? ''
  },
  arrivalTime: {
    hour: payload['arrivalTime-hour'] ?? '',
    minute: payload['arrivalTime-minute'] ?? ''
  },
  usesContainers:
    payload.usesContainers === 'true'
      ? true
      : payload.usesContainers === 'false'
        ? false
        : undefined
})

const entryFromPayload = (payload) => ({
  containerNumber: payload.containerNumber ?? '',
  sealNumber: payload.sealNumber ?? '',
  officialSeal: payload.officialSeal === 'true'
})

const emptyEntry = () => ({
  containerNumber: '',
  sealNumber: '',
  officialSeal: false
})

const selectItems = (placeholder, options, selected) => [
  { value: '', text: placeholder, selected: selected === '' },
  ...options.map((option) => ({
    ...option,
    selected: option.value === selected
  }))
]

const containerRows = ({ answers, evaluation }) =>
  state.collectionView(answers, ['containers'], evaluation).map((record) => ({
    index: record.index,
    containerNumber:
      record.entry.containerNumber || copy.containers.notProvided,
    sealNumber: record.entry.sealNumber || copy.containers.notProvided,
    officialSeal: record.entry.officialSeal
      ? copy.usesContainers.yes
      : copy.usesContainers.no
  }))

const render = (
  request,
  h,
  pageState,
  values,
  entry = emptyEntry(),
  { errors = {}, recoverableError = false } = {}
) => {
  const premisesOptions = controlPointsFor(values.borderControlPost)
  const base = kit.base(copy.heading, {
    backLink: kit.withChangeContext(
      request,
      hubPath(pageState.journey.journeyId)
    ),
    journey: pageState.journey,
    recoverableError
  })

  return h.view(view, {
    ...base,
    hubHref: kit.withChangeContext(request, base.hubHref),
    copy,
    values,
    entry,
    errors,
    errorSummary: kit.errorSummary(errors),
    bcpItems: selectItems(
      copy.bcp.placeholder,
      listBcps(),
      values.borderControlPost
    ),
    premisesItems: selectItems(
      copy.premises.placeholder,
      premisesOptions,
      values.inspectionPremises
    ),
    showPremises: premisesOptions.length > 0,
    meansItems: selectItems(
      copy.means.placeholder,
      meansOfTransportOptions,
      values.meansOfTransport
    ),
    rows: containerRows(pageState),
    showContainers: values.usesContainers === true
  })
}

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  return render(request, h, pageState, valuesFromAnswers(pageState.answers))
}

const postAddContainer = async (request, h, payload) => {
  const pageState = await state.get(request, h)
  const values = valuesFromPayload(payload)
  const rawEntry = entryFromPayload(payload)
  if (payload.usesContainers !== 'true') {
    return render(request, h, pageState, values, rawEntry, {
      errors: { usesContainers: copy.errors.usesContainersRequired }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  const { value, errors } = validate(containerFields(), payload)
  if (errors) {
    return render(request, h, pageState, values, rawEntry, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const entry = {
    containerNumber: value.containerNumber,
    sealNumber: value.sealNumber,
    officialSeal: payload.officialSeal === 'true'
  }
  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, { usesContainers: true })
      await state.appendEntry(request, h, 'containers', entry)
    },
    () =>
      render(request, h, pageState, values, rawEntry, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  const updated = await state.get(request, h)
  return render(request, h, updated, values)
}

const removeIndexOf = (action) => {
  const match = action.match(/^remove-container:(-?\d+)$/)
  return match ? Number(match[1]) : Number.NaN
}

const postRemoveContainer = async (request, h, payload, action) => {
  const pageState = await state.get(request, h)
  const index = removeIndexOf(action)
  const record = Number.isInteger(index)
    ? state
        .collectionView(pageState.answers, ['containers'], pageState.evaluation)
        .find((candidate) => candidate.index === index)
    : undefined
  if (!record) {
    return h.response().code(HTTP_STATUS_BAD_REQUEST)
  }

  const { failure } = await kit.recoverableSave(
    () => state.removeEntry(request, h, 'containers', index),
    () =>
      render(request, h, pageState, valuesFromPayload(payload), emptyEntry(), {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  const updated = await state.get(request, h)
  return render(request, h, updated, valuesFromPayload(payload))
}

const postSave = async (request, h, payload) => {
  const pageState = await state.get(request, h)
  const rawValues = valuesFromPayload(payload)
  const { value, errors } = validate(
    pageFields(String(payload.borderControlPost ?? '').trim()),
    payload
  )
  if (errors) {
    return render(request, h, pageState, rawValues, emptyEntry(), {
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  const cleaned = {
    borderControlPost: value.borderControlPost,
    ...(hasControlPoints(value.borderControlPost)
      ? { inspectionPremises: value.inspectionPremises }
      : {}),
    meansOfTransport: value.meansOfTransport,
    transportIdentification: value.transportIdentification,
    transportDocumentReference: value.transportDocumentReference,
    arrivalDate: {
      day: String(value['arrivalDate-day']).trim(),
      month: String(value['arrivalDate-month']).trim(),
      year: String(value['arrivalDate-year']).trim()
    },
    arrivalTime: {
      hour: String(value['arrivalTime-hour']).trim(),
      minute: String(value['arrivalTime-minute']).trim()
    },
    usesContainers: value.usesContainers === 'true'
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    () =>
      render(request, h, pageState, rawValues, emptyEntry(), {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const action = String(payload.action ?? '')
  if (action === 'add-container') {
    return postAddContainer(request, h, payload)
  }
  if (action.startsWith('remove-container:')) {
    return postRemoveContainer(request, h, payload, action)
  }
  return postSave(request, h, payload)
}

export const routes = kit.pageRoutes(page, { get, post })
