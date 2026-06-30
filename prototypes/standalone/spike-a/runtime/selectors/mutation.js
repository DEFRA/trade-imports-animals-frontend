import { stepById } from '../model.js'
import { applicableStepIds } from './status.js'
import { FIELD_TYPE, STEP_KIND } from './constants.js'

function collectDate(field, payload) {
  const day = payload[`${field.id}-day`]
  const month = payload[`${field.id}-month`]
  const year = payload[`${field.id}-year`]
  const anyPart = [day, month, year].some(
    (part) => part !== undefined && String(part).trim() !== ''
  )
  return anyPart ? { day, month, year } : undefined
}

function collectMultiSelect(field, payload) {
  const raw = payload[field.id]
  return raw === undefined ? [] : [].concat(raw)
}

function collectField(field, payload) {
  if (field.type === FIELD_TYPE.DATE) {
    return collectDate(field, payload)
  }
  if (field.type === FIELD_TYPE.MULTI_SELECT) {
    return collectMultiSelect(field, payload)
  }
  return payload[field.id]
}

/** Normalise a step's own fields from the raw form payload (no cascade). */
export function collect(stepId, payload) {
  const step = stepById.get(stepId)
  return Object.fromEntries(
    (step.fields ?? []).map((field) => [field.id, collectField(field, payload)])
  )
}

function clearStep(answers, step) {
  for (const field of step.fields ?? []) {
    answers[field.id] = undefined
  }
  if (step.kind === STEP_KIND.LOOP) {
    answers[step.done] = false
    answers[step.arrayKey] = []
  }
}

/** Merge the patch, then cascade-clear any step that stopped applying. */
export function applyAnswer(answers, stepId, payload) {
  const before = applicableStepIds(answers)
  const merged = { ...answers, ...collect(stepId, payload) }
  const after = applicableStepIds(merged)
  for (const goneId of before.filter((id) => !after.includes(id))) {
    clearStep(merged, stepById.get(goneId))
  }
  return merged
}
