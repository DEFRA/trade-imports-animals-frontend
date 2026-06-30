import { applicableSteps } from './applicability.js'

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

function liveGroupSteps(shape, stepId, answers) {
  const group = groupOf(shape, stepId)
  if (!group) {
    return null
  }
  const live = applicableSteps(answers)
  return group.stepIds.filter((id) => live.includes(id))
}

// Thin sequencer — JSON Schema has no ordering, so this adds it over annotations.
export function next(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  return live?.[live.indexOf(stepId) + 1] ?? { terminal: 'hub' }
}

export function prev(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  return live?.[live.indexOf(stepId) - 1] ?? { terminal: 'hub' }
}
