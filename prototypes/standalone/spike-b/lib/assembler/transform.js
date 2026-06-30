/**
 * Answers → domain transforms: per-field type coercion, step-field projection
 * and the claims loop projection.
 */

export const STEP_KIND_LOOP = 'loop'
export const STEP_KIND_SUBTASKS = 'subtasks'

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
      return value === 'yes'
    case 'number':
    case 'currency':
      return value === '' ? undefined : Number(value)
    default:
      return value
  }
}

export const transformStepFields = (step, answers) =>
  Object.fromEntries(
    (step.fields ?? [])
      .filter((field) => answers[field.id] !== undefined)
      .map((field) => [field.id, transformField(field, answers[field.id])])
  )

export const transformLoopItems = (step, answers) =>
  (answers[step.arrayKey] ?? []).map((item) => ({
    ...item,
    claimAmount:
      item.claimAmount === undefined ? undefined : Number(item.claimAmount)
  }))
