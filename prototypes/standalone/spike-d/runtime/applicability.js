import { schema, activeBranches, ifProvenance } from '../validation/index.js'
import { steps, stepMeta, stepFields } from './step-meta.js'

// The set of fields required right now: schema.required + active if/then.required.
export function requiredNow(answers) {
  const set = new Set(schema.required)
  for (const branch of activeBranches(answers)) {
    for (const req of branch.then.required ?? []) {
      set.add(req)
    }
  }
  return set
}

// Why a field is required now: [] if base-required, else the if-condition that fired.
export function requiredBecause(fieldId, answers) {
  if (schema.required.includes(fieldId)) {
    return []
  }
  for (const branch of activeBranches(answers)) {
    if ((branch.then.required ?? []).includes(fieldId)) {
      return ifProvenance(branch.if)
    }
  }
  return []
}

export function applicableSteps(answers) {
  const required = requiredNow(answers)
  return steps.filter((stepId) => {
    if (stepMeta[stepId]?.kind === 'subtasks') {
      return true
    }
    // Required-ness alone — every normal step has a base-required field, and the
    // conditional `claims` step is live exactly when its if/then makes `claims`
    // required. (Using "answered" here would keep claims live after its data is
    // cleared, breaking the cascade.)
    return stepFields(stepId).some((field) => required.has(field))
  })
}
