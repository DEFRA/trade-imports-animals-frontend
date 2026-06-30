import { machine } from './model.js'
import { fieldsFor } from './steps.js'
import { applicableSteps } from './navigation.js'

/**
 * Answer mutation + applicability cascade — `collect` normalises a raw POST
 * payload into a step patch, `applyAnswer` merges it and clears any step that
 * drops out of the realised path as a result (so stale answers cannot linger).
 */

const FIELD_TYPE_DATE = 'date'
const FIELD_TYPE_MULTI_SELECT = 'multi-select'
const STEP_KIND_LOOP = 'loop'

const collectDateValue = (field, payload) => {
  const day = payload[`${field.id}-day`]
  const month = payload[`${field.id}-month`]
  const year = payload[`${field.id}-year`]
  const anyPart = [day, month, year].some(
    (part) => part !== undefined && String(part).trim() !== ''
  )
  return anyPart ? { day, month, year } : undefined
}

const collectMultiSelectValue = (field, payload) =>
  payload[field.id] === undefined ? [] : [].concat(payload[field.id])

const valueForField = (field, payload) => {
  if (field.type === FIELD_TYPE_DATE) {
    return collectDateValue(field, payload)
  }
  if (field.type === FIELD_TYPE_MULTI_SELECT) {
    return collectMultiSelectValue(field, payload)
  }
  return payload[field.id]
}

export function collect(stepId, payload) {
  return Object.fromEntries(
    fieldsFor(stepId).map((field) => [field.id, valueForField(field, payload)])
  )
}

function clearStep(answers, stepId) {
  const state = machine.states[stepId]
  for (const fieldId of state.fields ?? []) {
    answers[fieldId] = undefined
  }
  if (state.kind === STEP_KIND_LOOP) {
    answers[state.done] = false
    answers[state.arrayKey] = []
  }
}

export function applyAnswer(answers, stepId, payload) {
  const before = applicableSteps(answers)
  const merged = { ...answers, ...collect(stepId, payload) }
  const after = applicableSteps(merged)
  for (const goneId of before.filter((id) => !after.includes(id))) {
    clearStep(merged, goneId)
  }
  return merged
}
