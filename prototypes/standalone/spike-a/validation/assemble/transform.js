import { getSelectedAddons } from '../../lib/addons/index.js'
import { applicableSteps } from './applicable.js'

/**
 * Form answers → domain quote object (ISO dates, booleans, numbers, enums).
 * The journey stores form-shaped answers; `toDomain` is the two-shape transform
 * exported so the one-shape strategy can be unit-tested and compared.
 */

const FIELD_TYPE = Object.freeze({
  DATE: 'date',
  BOOLEAN: 'boolean',
  NUMBER: 'number',
  CURRENCY: 'currency'
})
const YES = 'yes'

function pad(value) {
  return String(value).padStart(2, '0')
}

function isoDate(dob) {
  if (!dob || !dob.day || !dob.month || !dob.year) {
    return undefined
  }
  return `${dob.year}-${pad(dob.month)}-${pad(dob.day)}`
}

function transformField(field, value) {
  switch (field.type) {
    case FIELD_TYPE.DATE:
      return isoDate(value)
    case FIELD_TYPE.BOOLEAN:
      return value === YES
    case FIELD_TYPE.NUMBER:
    case FIELD_TYPE.CURRENCY:
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformFields = (answers) =>
  Object.fromEntries(
    applicableSteps(answers).flatMap((step) =>
      (step.fields ?? [])
        .filter((field) => answers[field.id] !== undefined)
        .map((field) => [field.id, transformField(field, answers[field.id])])
    )
  )

const transformClaims = (answers) =>
  (answers.claims ?? []).map((claim) => ({
    claimType: claim.claimType,
    claimAmount:
      claim.claimAmount === undefined ? undefined : Number(claim.claimAmount)
  }))

export function toDomain(answers) {
  return {
    ...transformFields(answers),
    ...(answers.hadClaims === YES ? { claims: transformClaims(answers) } : {}),
    selectedAddons: getSelectedAddons(answers)
  }
}
