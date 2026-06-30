import { getSelectedAddons } from '../addons/index.js'

/**
 * Answers -> domain transform: per-field coercion plus the per-step contribution
 * (scalars, loop arrays, selected add-ons) folded into the domain quote.
 */

const BOOLEAN_TRUE_VALUE = 'yes'

const pad = (value) => String(value).padStart(2, '0')

const isoDate = (dob) => {
  if (!dob || !dob.day || !dob.month || !dob.year) {
    return undefined
  }
  return `${dob.year}-${pad(dob.month)}-${pad(dob.day)}`
}

const transformField = (field, value) => {
  switch (field.type) {
    case 'date':
      return isoDate(value)
    case 'boolean':
      return value === BOOLEAN_TRUE_VALUE
    case 'number':
    case 'currency':
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformClaimAmount = (claim) => ({
  ...claim,
  claimAmount:
    claim.claimAmount === undefined ? undefined : Number(claim.claimAmount)
})

const transformLoopItems = (step, answers) =>
  (answers[step.arrayKey] ?? []).map(transformClaimAmount)

const scalarContribution = (step, answers) =>
  Object.fromEntries(
    (step.fields ?? [])
      .filter((field) => answers[field.id] !== undefined)
      .map((field) => [field.id, transformField(field, answers[field.id])])
  )

export const stepContribution = (step, answers) => {
  const base = scalarContribution(step, answers)
  if (step.kind === 'loop') {
    return { ...base, [step.arrayKey]: transformLoopItems(step, answers) }
  }
  if (step.kind === 'subtasks') {
    return { ...base, selectedAddons: getSelectedAddons(answers) }
  }
  return base
}
