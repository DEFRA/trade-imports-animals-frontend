import { stepById } from '../model.js'
import { applicableSteps } from '../engine/index.js'
import { fieldsFor } from './view.js'

/**
 * Answer mutation: read a submitted payload into a quote patch, clear a step's
 * answers, and apply an answer with cascade retraction of steps that the new
 * answers make no longer applicable.
 */

const FIELD_TYPE_DATE = 'date'
const FIELD_TYPE_MULTI_SELECT = 'multi-select'
const DATE_PARTS = ['day', 'month', 'year']

const collectDateField = (field, payload) => {
  const parts = Object.fromEntries(
    DATE_PARTS.map((part) => [part, payload[`${field.id}-${part}`]])
  )
  const anyPart = Object.values(parts).some(
    (part) => part !== undefined && String(part).trim() !== ''
  )
  return anyPart ? parts : undefined
}

const collectMultiSelectField = (field, payload) => {
  const raw = payload[field.id]
  return raw === undefined ? [] : [].concat(raw)
}

const collectField = (field, payload) => {
  if (field.type === FIELD_TYPE_DATE) {
    return collectDateField(field, payload)
  }
  if (field.type === FIELD_TYPE_MULTI_SELECT) {
    return collectMultiSelectField(field, payload)
  }
  return payload[field.id]
}

export function collect(stepId, payload) {
  return Object.fromEntries(
    fieldsFor(stepId).map((field) => [field.id, collectField(field, payload)])
  )
}

function clearStep(answers, stepId) {
  const step = stepById.get(stepId)
  for (const field of fieldsFor(stepId)) {
    answers[field.id] = undefined
  }
  if (step.kind === 'loop') {
    answers[step.done] = false
    answers[step.arrayKey] = []
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
