import Joi from 'joi'

import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { validate } from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { grossVolumeUnitOptions } from '../../../../services/reference/gross-volume-units.js'
import {
  CLEAN_DECIMAL,
  isLosslessMeasurementNumber
} from '../../../../services/records/measurement-number.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import { measurementInput } from './measurement-format.js'
import { commodityAdditionalDetailsPage as page } from './page.js'

export const meta = {
  ...page,
  collects: ['totalGrossWeight', 'grossVolume', 'grossVolumeUnit']
}

const view = `${TEMPLATES}/features/additional-details/template`
const copy = copyFor({ en, cy })
const MAX_WEIGHT_DECIMAL_PLACES = 5
const trimmed = (value) => String(value ?? '').trim()

const totalGrossWeightRule = (netWeightTotal) =>
  Joi.any()
    .custom((raw, helpers) => {
      const value = trimmed(raw)
      if (!value) {
        return helpers.error('weight.required')
      }
      if (
        !CLEAN_DECIMAL.test(value) ||
        !Number.isFinite(Number(value)) ||
        !isLosslessMeasurementNumber(value)
      ) {
        return helpers.error('weight.number')
      }
      const decimalPlaces = value.split('.')[1]?.length ?? 0
      if (decimalPlaces > MAX_WEIGHT_DECIMAL_PLACES) {
        return helpers.error('weight.decimalPlaces')
      }
      if (Number(value) <= netWeightTotal) {
        return helpers.error('weight.greaterThanNet')
      }
      return value
    })
    .messages({
      'weight.required': copy.errors.totalGrossWeightRequired,
      'weight.number': copy.errors.totalGrossWeightNumber,
      'weight.greaterThanNet': copy.errors.totalGrossWeightGreaterThanNet,
      'weight.decimalPlaces': copy.errors.totalGrossWeightDecimalPlaces
    })

const grossVolumeRule = () =>
  Joi.any()
    .custom((raw, helpers) => {
      const value = trimmed(raw)
      const unit = trimmed(helpers.state.ancestors[0]?.grossVolumeUnit)
      if (!value && unit) {
        return helpers.error('volume.requiredWithUnit')
      }
      if (
        value &&
        (!CLEAN_DECIMAL.test(value) ||
          !Number.isFinite(Number(value)) ||
          !isLosslessMeasurementNumber(value))
      ) {
        return helpers.error('volume.number')
      }
      return value
    })
    .messages({
      'volume.requiredWithUnit': copy.errors.grossVolumeRequiredWithUnit,
      'volume.number': copy.errors.grossVolumeNumber
    })

const grossVolumeUnitRule = (unitCodes) =>
  Joi.any()
    .custom((raw, helpers) => {
      const value = trimmed(raw)
      const volume = trimmed(helpers.state.ancestors[0]?.grossVolume)
      if (volume && !unitCodes.includes(value)) {
        return helpers.error('unit.required')
      }
      if (value && !unitCodes.includes(value)) {
        return helpers.error('unit.required')
      }
      return value
    })
    .messages({ 'unit.required': copy.errors.grossVolumeUnitRequired })

const fields = (netWeightTotal, unitCodes) =>
  Joi.object({
    totalGrossWeight: totalGrossWeightRule(netWeightTotal),
    grossVolume: grossVolumeRule(),
    grossVolumeUnit: grossVolumeUnitRule(unitCodes)
  }).unknown(true)

const valuesFrom = (source) => ({
  totalGrossWeight: measurementInput(source.totalGrossWeight),
  grossVolume: measurementInput(source.grossVolume),
  grossVolumeUnit: source.grossVolumeUnit ?? ''
})

const totalsFrom = (answers) => {
  const commodityLines = Array.isArray(answers.commodityLines)
    ? answers.commodityLines
    : []
  return {
    netWeightTotal: commodityLines.reduce(
      (total, line) => total + Number(line?.netWeight ?? 0),
      0
    ),
    packagesTotal: commodityLines.reduce(
      (total, line) => total + Number(line?.numberOfPackages ?? 0),
      0
    )
  }
}

const unitItems = (selected) => [
  {
    value: '',
    text: copy.fields.grossVolumeUnit.placeholder,
    selected: selected === ''
  },
  ...grossVolumeUnitOptions.map((option) => ({
    ...option,
    selected: option.value === selected
  }))
]

const render = (
  h,
  pageState,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.heading, {
      backLink: hubPath(pageState.journey.journeyId),
      journey: pageState.journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    ...totalsFrom(pageState.answers),
    grossVolumeUnitItems: unitItems(values.grossVolumeUnit)
  })

const get = async (request, h) => {
  const pageState = await state.get(request, h)
  return render(h, pageState, valuesFrom(pageState.answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const rawValues = valuesFrom(payload)
  const pageState = await state.get(request, h)
  const { netWeightTotal } = totalsFrom(pageState.answers)
  const unitCodes = grossVolumeUnitOptions.map(({ value }) => value)
  const { value, errors } = validate(fields(netWeightTotal, unitCodes), payload)
  if (errors) {
    return render(h, pageState, rawValues, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const cleaned = {
    totalGrossWeight: Number(value.totalGrossWeight),
    grossVolume: value.grossVolume ? Number(value.grossVolume) : undefined,
    ...(value.grossVolume ? { grossVolumeUnit: value.grossVolumeUnit } : {})
  }
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, cleaned)
    },
    () =>
      render(h, pageState, rawValues, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
