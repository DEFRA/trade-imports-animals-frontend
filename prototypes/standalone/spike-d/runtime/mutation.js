import { fieldsFor, stepMeta } from './step-meta.js'
import { applicableSteps } from './applicability.js'

const FIELD_TYPE = { DATE: 'date', MULTI_SELECT: 'multi-select' }
const STEP_KIND_LOOP = 'loop'
const DATE_PARTS = ['day', 'month', 'year']

const collectDateField = (field, payload) => {
  const parts = DATE_PARTS.map((part) => payload[`${field.id}-${part}`])
  const anyPart = parts.some(
    (part) => part !== undefined && String(part).trim() !== ''
  )
  const [day, month, year] = parts
  return anyPart ? { day, month, year } : undefined
}

const collectMultiSelectField = (field, payload) => {
  const raw = payload[field.id]
  return raw === undefined ? [] : [].concat(raw)
}

const collectScalarField = (field, payload) => payload[field.id]

const collectors = {
  [FIELD_TYPE.DATE]: collectDateField,
  [FIELD_TYPE.MULTI_SELECT]: collectMultiSelectField
}

const collectFor = (field, payload) =>
  (collectors[field.type] ?? collectScalarField)(field, payload)

export function collect(stepId, payload) {
  return Object.fromEntries(
    fieldsFor(stepId).map((field) => [field.id, collectFor(field, payload)])
  )
}

function clearStep(answers, stepId) {
  for (const field of fieldsFor(stepId)) {
    answers[field.id] = undefined
  }
  const meta = stepMeta[stepId] ?? {}
  if (meta.kind === STEP_KIND_LOOP) {
    answers[meta.done] = false
    answers[meta.arrayKey] = []
  }
}

// Flipping the if-condition strips the keys the schema no longer requires.
export function applyAnswer(answers, stepId, payload) {
  const before = applicableSteps(answers)
  const merged = { ...answers, ...collect(stepId, payload) }
  const after = applicableSteps(merged)
  for (const goneId of before.filter((id) => !after.includes(id))) {
    clearStep(merged, goneId)
  }
  return merged
}
