import { evalCondition } from '../lib/conditions.js'

/**
 * A tiny, dependency-free statechart interpreter. It knows nothing about the
 * journey, njk or routes — it just walks guarded transitions over an answer
 * context. The contract (../runtime/contract.js) is built on top of it, so
 * navigation *falls out of the machine* rather than being hand-coded.
 */

/** Each state advances on exactly one event (SUBMIT, or CONTINUE for a loop). */
export function advancingEvent(state) {
  return state.on ? Object.keys(state.on)[0] : undefined
}

const isFinal = (state) => state.type === 'final' || !state.on

/** The next state id from `stateId` under the current answers, or null at the end. */
export function transition(machine, stateId, answers) {
  const state = machine.states[stateId]
  const event = advancingEvent(state)
  if (!event) {
    return null
  }
  const chosen = machine.states[stateId].on[event].find((t) =>
    evalCondition(t.guard, answers)
  )
  return chosen ? chosen.target : null
}

/** Non-final states on the realised path from `initial` to the final state. */
export function realizedPath(machine, answers) {
  const path = []
  let current = machine.initial
  const seen = new Set()
  while (current && !isFinal(machine.states[current]) && !seen.has(current)) {
    seen.add(current)
    path.push(current)
    current = transition(machine, current, answers)
  }
  return path
}

/** Static map of target state id → the source state ids that can reach it. */
export function reverseIndex(machine) {
  const index = new Map()
  for (const [sourceId, state] of Object.entries(machine.states)) {
    const event = advancingEvent(state)
    if (!event) {
      continue
    }
    for (const t of state.on[event]) {
      if (!index.has(t.target)) {
        index.set(t.target, [])
      }
      index.get(t.target).push(sourceId)
    }
  }
  return index
}

/**
 * The previous state under the current answers — the source whose realised
 * transition actually targets `stateId`. Two sources can target one state
 * (claims → cover-type and driving-history → cover-type), so it is resolved
 * against `answers`, not the static graph.
 */
export function prevState(
  machine,
  stateId,
  answers,
  index = reverseIndex(machine)
) {
  const sources = index.get(stateId) ?? []
  return (
    sources.find(
      (sourceId) => transition(machine, sourceId, answers) === stateId
    ) ?? null
  )
}

/** The guard on the realised transition into `stateId` (its provenance), if any. */
export function incomingGuard(machine, stateId, answers, index) {
  const source = prevState(machine, stateId, answers, index)
  if (!source) {
    return undefined
  }
  const event = advancingEvent(machine.states[source])
  const chosen = machine.states[source].on[event].find(
    (t) => t.target === stateId && evalCondition(t.guard, answers)
  )
  return chosen?.guard
}
