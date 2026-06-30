import { applicableStepIds } from './status.js'
import { HUB_TERMINAL } from './constants.js'

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

function liveGroupSteps(shape, stepId, answers) {
  const group = groupOf(shape, stepId)
  if (!group) {
    return null
  }
  const live = applicableStepIds(answers)
  return group.stepIds.filter((id) => live.includes(id))
}

export function next(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  if (!live) {
    return HUB_TERMINAL
  }
  const nextStep = live[live.indexOf(stepId) + 1]
  return nextStep ?? HUB_TERMINAL
}

export function prev(answers, stepId, shape) {
  const live = liveGroupSteps(shape, stepId, answers)
  if (!live) {
    return HUB_TERMINAL
  }
  const prevStep = live[live.indexOf(stepId) - 1]
  return prevStep ?? HUB_TERMINAL
}
