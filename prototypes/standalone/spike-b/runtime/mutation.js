import { machine } from './model.js'
import { fieldsFor } from './steps.js'
import { applicableSteps } from './navigation.js'

/**
 * Answer mutation + applicability cascade — `collect` normalises a raw POST
 * payload into a step patch, `applyAnswer` merges it and clears any step that
 * drops out of the realised path as a result (so stale answers cannot linger).
 */

export function collect(stepId, payload) {
  const patch = {}
  for (const field of fieldsFor(stepId)) {
    if (field.type === 'date') {
      const day = payload[`${field.id}-day`]
      const month = payload[`${field.id}-month`]
      const year = payload[`${field.id}-year`]
      const anyPart = [day, month, year].some(
        (part) => part !== undefined && String(part).trim() !== ''
      )
      patch[field.id] = anyPart ? { day, month, year } : undefined
    } else if (field.type === 'multi-select') {
      const raw = payload[field.id]
      patch[field.id] = raw === undefined ? [] : [].concat(raw)
    } else {
      patch[field.id] = payload[field.id]
    }
  }
  return patch
}

function clearStep(answers, stepId) {
  const state = machine.states[stepId]
  for (const fieldId of state.fields ?? []) {
    answers[fieldId] = undefined
  }
  if (state.kind === 'loop') {
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
