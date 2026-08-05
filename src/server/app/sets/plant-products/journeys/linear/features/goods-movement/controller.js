import Joi from 'joi'

import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { goodsMovementServicesPage as page } from './page.js'

export const meta = {
  ...page,
  collects: ['commonTransitConvention', 'movementReferenceNumber', 'usingGvms']
}

const view = `${TEMPLATES}/features/goods-movement/template`
const copy = copyFor({ en, cy })
const CTC_VALUES = ['ADD_MRN_NOW', 'ADD_MRN_LATER', 'NO']
const MRN = /^\d{2}[A-Za-z0-9]{16}$/
const MRN_LENGTH = 18

const movementReferenceNumberField = Joi.object({
  movementReferenceNumber: Joi.string()
    .trim()
    .required()
    .length(MRN_LENGTH)
    .pattern(MRN)
    .messages({
      'string.empty': copy.errors.movementReferenceNumberInvalid,
      'any.required': copy.errors.movementReferenceNumberInvalid,
      'string.length': copy.errors.movementReferenceNumberInvalid,
      'string.pattern.base': copy.errors.movementReferenceNumberInvalid
    })
}).unknown(true)

const fields = (movementReferenceNumberInScope) =>
  compose(
    requiredOneOf(
      'commonTransitConvention',
      CTC_VALUES,
      copy.errors.commonTransitConventionRequired
    ),
    ...(movementReferenceNumberInScope ? [movementReferenceNumberField] : []),
    requiredOneOf('usingGvms', ['yes', 'no'], copy.errors.usingGvmsRequired)
  )

const usingGvmsValue = (value) =>
  value === true ? 'yes' : value === false ? 'no' : ''

const valuesFromAnswers = (answers) => ({
  commonTransitConvention: answers.commonTransitConvention ?? '',
  movementReferenceNumber: answers.movementReferenceNumber ?? '',
  usingGvms: usingGvmsValue(answers.usingGvms)
})

const valuesFromPayload = (payload) => ({
  commonTransitConvention: payload.commonTransitConvention ?? '',
  movementReferenceNumber: payload.movementReferenceNumber ?? '',
  usingGvms: payload.usingGvms ?? ''
})

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFromAnswers(answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const rawValues = valuesFromPayload(payload)
  const movementReferenceNumberInScope =
    String(payload.commonTransitConvention ?? '').trim() === 'ADD_MRN_NOW'
  const { value, errors } = validate(
    fields(movementReferenceNumberInScope),
    payload
  )
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, rawValues, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const cleaned = {
    commonTransitConvention: value.commonTransitConvention,
    ...(movementReferenceNumberInScope
      ? { movementReferenceNumber: value.movementReferenceNumber }
      : {}),
    usingGvms: value.usingGvms
  }
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, rawValues, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
