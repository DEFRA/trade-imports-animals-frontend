import { machine } from './model.js'

/**
 * Step metadata over `machine.states` — the static shape of each step (its kind,
 * title and field specs), independent of any answers. `stepIds` is every
 * non-final state in declaration order.
 */

export const stepIds = Object.keys(machine.states).filter(
  (id) => machine.states[id].type !== 'final'
)

export const stepKind = (id) => machine.states[id]?.kind
export const stepTitle = (id) => machine.states[id]?.title
export const fieldSpec = (id) => ({ id, ...machine.context.fields[id] })
export const fieldsFor = (stepId) =>
  (machine.states[stepId]?.fields ?? []).map(fieldSpec)

export const getStep = (stepId) => ({
  id: stepId,
  kind: machine.states[stepId].kind,
  fields: fieldsFor(stepId),
  done: machine.states[stepId].done,
  arrayKey: machine.states[stepId].arrayKey
})
