import { scopeAnswered } from '../reasons.js'

/**
 * Graft 5 — expressiveness demos for the claims the paradigm makes about
 * scoping-as-functions (obligations.md:205-236): interval algebra,
 * quantifiers, within-fulfilment activation, injected external state,
 * failed-lookup-as-unsatisfied and the mandate flip. Exercised by unit
 * tests over FIXTURE obligations only; none of these is ever registered
 * against a journey obligation (the scope barrel namespaces them under
 * `demos`).
 */

const values = (view, name) =>
  Object.values(view.fulfilmentsOf(name)).map((fulfilment) => fulfilment.value)

/** Quantifier: fires when any fulfilment of `name` matches the predicate. */
export const anyFulfilmentMatches = (name, predicate) => (view) =>
  values(view, name).some(predicate) ? { status: 'mandatory' } : null

/**
 * Interval algebra: fires (a gap explanation becomes mandatory) when the
 * `{ from, to }` intervals of `name` do NOT cover the last `years` years
 * with no gaps. `today` is injected for determinism.
 */
export const intervalsLeaveGap = (name, years, today) => (view) => {
  const end = Date.parse(today)
  let cursor = end - years * 365.25 * 24 * 60 * 60 * 1000
  const intervals = values(view, name)
    .filter((value) => value?.from)
    .sort((a, b) => Date.parse(a.from) - Date.parse(b.from))
  for (const { from, to } of intervals) {
    if (Date.parse(from) > cursor) {
      break
    }
    cursor = Math.max(cursor, to ? Date.parse(to) : end)
  }
  return cursor < end ? { status: 'mandatory' } : null
}

/**
 * Within-fulfilment activation: a follow-up becomes mandatory when any
 * fulfilment of the controlling collection exceeds the threshold (the
 * "professionally fitted when cost > £500" case).
 */
export const anyValueOver = (name, threshold) => (view) =>
  values(view, name).some((value) => Number(value) > threshold)
    ? { status: 'mandatory' }
    : null

/** External state: fires from the orchestrator-injected fixture, not fulfilments. */
export const externalFlagIsSet = (key) => (view, externalState) =>
  externalState?.[key] ? { status: 'mandatory' } : null

/**
 * Failed-lookup-as-unsatisfied: a lookup that returned `{ ok: false }` (or
 * nothing yet) keeps its obligation in scope and mandatory, so the
 * orchestrator re-fires it — failure is just an unsatisfied obligation.
 */
export const lookupUnresolved = (name) => (view) => {
  const result = view.valueOf(name)
  return result === undefined || result?.ok === false
    ? { status: 'mandatory' }
    : null
}

/**
 * Mandate flip: in scope either way, mandatory only while the numeric
 * controller value meets the threshold. Data is preserved across flips —
 * only scope exit wipes (obligations.md:198-199).
 */
export const mandatoryWhenAtLeast = (controller, threshold) => (view) => {
  const value = Number(view.valueOf(controller))
  return Number.isFinite(value) && value >= threshold
    ? {
        status: 'mandatory',
        reasons: [scopeAnswered(String(value), controller)]
      }
    : { status: 'optional' }
}
