import { fields, stepById } from '../model.js'
import { evaluate, applicableSteps, requiredFieldsOfStep } from '../engine.js'
import { isSatisfied } from '../../lib/fieldutil.js'
import { allSelectedAddonsComplete } from '../../lib/addons/index.js'

/**
 * Task status derivation: each step's complete/partial/not-started state under
 * the current answers, and whether the whole live journey is complete.
 */

export function status(answers, stepId) {
  if (!applicableSteps(answers).includes(stepId)) {
    return 'not-applicable'
  }
  const step = stepById.get(stepId)
  if (step.kind === 'loop') {
    if (answers[step.done] === true) {
      return 'complete'
    }
    return (answers[step.arrayKey] ?? []).length ? 'partial' : 'not-started'
  }
  if (step.kind === 'subtasks') {
    if (answers.selectedAddons === undefined) {
      return 'not-started'
    }
    return allSelectedAddonsComplete(answers) ? 'complete' : 'partial'
  }
  const snapshot = evaluate(answers)
  const required = requiredFieldsOfStep(stepId, snapshot)
  const allRequired = required.every((id) => snapshot.satisfied.has(id))
  if (required.length && allRequired) {
    return 'complete'
  }
  const anyAnswered = Object.keys(fields).some(
    (id) => fields[id].step === stepId && isSatisfied(fields[id], answers[id])
  )
  return anyAnswered ? 'partial' : 'not-started'
}

export const allComplete = (answers) =>
  applicableSteps(answers).every((id) => status(answers, id) === 'complete')
