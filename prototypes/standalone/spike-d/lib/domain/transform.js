import { getSelectedAddons } from '../addons/index.js'

const BOOLEAN_TRUE = 'yes'
const DATE_PART_WIDTH = 2

const pad = (value) => String(value).padStart(DATE_PART_WIDTH, '0')

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
      return value === BOOLEAN_TRUE
    case 'number':
    case 'currency':
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

const transformFields = (step, answers) =>
  Object.fromEntries(
    (step.fields ?? [])
      .filter((field) => answers[field.id] !== undefined)
      .map((field) => [field.id, transformField(field, answers[field.id])])
  )

const transformClaimItem = (item) => ({
  ...item,
  claimAmount:
    item.claimAmount === undefined ? undefined : Number(item.claimAmount)
})

const transformLoopItems = (step, answers) =>
  (answers[step.arrayKey] ?? []).map(transformClaimItem)

export function toDomain(view, answers) {
  const quote = {}
  for (const stepId of view.getApplicableSteps(answers)) {
    const step = view.getStep(stepId)
    Object.assign(quote, transformFields(step, answers))
    if (step.kind === 'loop') {
      quote[step.arrayKey] = transformLoopItems(step, answers)
    }
    if (step.kind === 'subtasks') {
      quote.selectedAddons = getSelectedAddons(answers)
    }
  }
  return quote
}
