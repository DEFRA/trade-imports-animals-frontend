import { stepById } from '../model.js'
import { applicableSteps } from '../engine.js'
import { fieldsFor } from './view.js'

/**
 * Answer mutation: read a submitted payload into a quote patch, clear a step's
 * answers, and apply an answer with cascade retraction of steps that the new
 * answers make no longer applicable.
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
