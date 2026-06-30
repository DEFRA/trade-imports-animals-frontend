import { machine } from './model.js'
import {
  realizedPath,
  transition,
  prevState,
  incomingGuard,
  reverseIndex
} from './interpreter.js'
import { provenance } from '../lib/conditions.js'

/**
 * Machine-derived navigation — `next` / `prev` come from the machine's guarded
 * transitions and a reverse index, `applicableSteps` is the realised path
 * (reachability under guards). This is the heart of the FSM paradigm:
 * "where the machine says to go next" lives here, separate from "what URL that
 * maps to" (journey/links.js).
 */

const REVERSE = reverseIndex(machine)

export const applicableSteps = (answers) => realizedPath(machine, answers)

const groupOf = (shape, stepId) =>
  shape.groups?.find((group) => group.stepIds.includes(stepId))

export function next(answers, stepId, shape) {
  const target = transition(machine, stepId, answers)
  // A transition into the machine's `final` state means the journey is over.
  const atEnd = !target || machine.states[target]?.type === 'final'
  const group = groupOf(shape, stepId)
  return !atEnd && group?.stepIds.includes(target)
    ? target
    : { terminal: 'hub' }
}

export function prev(answers, stepId, shape) {
  const source = prevState(machine, stepId, answers, REVERSE)
  const group = groupOf(shape, stepId)
  return source && group?.stepIds.includes(source)
    ? source
    : { terminal: 'hub' }
}

export const provenanceForStep = (stepId, answers) =>
  provenance(incomingGuard(machine, stepId, answers, REVERSE))
