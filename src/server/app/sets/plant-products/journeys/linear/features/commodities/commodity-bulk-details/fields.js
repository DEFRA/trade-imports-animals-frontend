import Joi from 'joi'

import {
  compose,
  oneOf,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { isPlantsForPlanting } from '../../../../../services/commodities/index.js'
import { packageTypeOptions } from '../../../../../services/reference/package-types.js'
import { quantityTypeOptions } from '../../../../../services/reference/quantity-types.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'

const copy = copyFor({ en, cy }).commodityBulkDetails

export const LINE_FIELDS = [
  'numberOfPackages',
  'packageType',
  'quantity',
  'quantityType',
  'netWeight',
  'controlledAtmosphereContainer',
  'finishedOrPropagated',
  'intendedForFinalUsers',
  'testAndTrial'
]

export const BULK_FIELDS = [
  'numberOfPackages',
  'packageType',
  'quantity',
  'quantityType',
  'netWeight',
  'controlledAtmosphereContainer'
]

export const lineField = (name, index) => `${name}-${index}`
export const bulkField = (name) => `bulk-${name}`

const single = (name, rule) => Joi.object({ [name]: rule }).unknown(true)

const requiredNumberOfPackages = (name) =>
  single(
    name,
    Joi.string()
      .trim()
      .required()
      .custom((raw, helpers) =>
        /^\d+$/.test(raw) ? raw : helpers.error('number.whole')
      )
      .messages({
        'string.empty': copy.errors.numberOfPackagesRequired,
        'any.required': copy.errors.numberOfPackagesRequired,
        'number.whole': copy.errors.numberOfPackagesWhole
      })
  )

const optionalNumberOfPackages = (name) =>
  single(
    name,
    Joi.string()
      .trim()
      .allow('')
      .custom((raw, helpers) =>
        raw === '' || /^\d+$/.test(raw) ? raw : helpers.error('number.whole')
      )
      .messages({ 'number.whole': copy.errors.numberOfPackagesWhole })
  )

const quantityRule = (name, { required }) => {
  let rule = Joi.string().trim()
  if (required) {
    rule = rule.required()
  } else {
    rule = rule.allow('')
  }
  return single(
    name,
    rule
      .custom((raw, helpers) => {
        if (!required && raw === '') {
          return raw
        }
        if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) {
          return helpers.error('number.format')
        }
        if (raw.replace('.', '').length > 16 || Number(raw) <= 0) {
          return helpers.error('number.format')
        }
        return raw
      })
      .messages({
        'string.empty': copy.errors.quantityRequired,
        'any.required': copy.errors.quantityRequired,
        'number.format': copy.errors.quantityFormat
      })
  )
}

const netWeightRule = (name, { required }) => {
  let rule = Joi.string().trim()
  if (required) {
    rule = rule.required()
  } else {
    rule = rule.allow('')
  }
  return single(
    name,
    rule
      .custom((raw, helpers) => {
        if (!required && raw === '') {
          return raw
        }
        if (!/^\d+(?:\.\d+)?$/.test(raw) || Number(raw) < 0.001) {
          return helpers.error('number.min')
        }
        const decimals = raw.split('.')[1] ?? ''
        if (decimals.length > 3) {
          return helpers.error('number.decimals')
        }
        if (raw.replace('.', '').length > 16) {
          return helpers.error('number.digits')
        }
        return raw
      })
      .messages({
        'string.empty': copy.errors.netWeightRequired,
        'any.required': copy.errors.netWeightRequired,
        'number.min': copy.errors.netWeightMin,
        'number.decimals': copy.errors.netWeightDecimals,
        'number.digits': copy.errors.netWeightDigits
      })
  )
}

const valuesOf = (options) => options.map(({ value }) => value)
const packageTypes = valuesOf(packageTypeOptions)
const quantityTypes = valuesOf(quantityTypeOptions)

const lineSchema = ({ index, entry }) =>
  compose(
    requiredNumberOfPackages(lineField('numberOfPackages', index)),
    requiredOneOf(
      lineField('packageType', index),
      packageTypes,
      copy.errors.packageTypeRequired
    ),
    quantityRule(lineField('quantity', index), { required: true }),
    requiredOneOf(
      lineField('quantityType', index),
      quantityTypes,
      copy.errors.quantityTypeRequired
    ),
    netWeightRule(lineField('netWeight', index), { required: true }),
    oneOf(lineField('controlledAtmosphereContainer', index), ['true', 'false']),
    ...(isPlantsForPlanting(entry.commoditySelection)
      ? [
          requiredOneOf(
            lineField('finishedOrPropagated', index),
            ['FINISHED', 'PROPAGATED'],
            copy.errors.finishedOrPropagatedRequired
          )
        ]
      : []),
    oneOf(lineField('intendedForFinalUsers', index), ['true', 'false']),
    oneOf(lineField('testAndTrial', index), ['true'])
  )

export const validateLines = (lines, payload) =>
  validate(compose(...lines.map(lineSchema)), payload)

const bulkSchema = () =>
  compose(
    optionalNumberOfPackages(bulkField('numberOfPackages')),
    oneOf(bulkField('packageType'), packageTypes),
    quantityRule(bulkField('quantity'), { required: false }),
    oneOf(bulkField('quantityType'), quantityTypes),
    netWeightRule(bulkField('netWeight'), { required: false }),
    oneOf(bulkField('controlledAtmosphereContainer'), ['true', 'false'])
  )

export const validateBulk = (payload) => validate(bulkSchema(), payload)
