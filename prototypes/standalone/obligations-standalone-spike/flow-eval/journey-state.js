import {
  containerStatus,
  FULFILLED,
  IN_PROGRESS,
  NOT_APPLICABLE,
  NOT_STARTED
} from './container-status.js'

/**
 * Journey lifecycle (obligations.md:1424-1442): Not Started, In
 * Progress, Fulfilled, Submitted. Fulfilled iff every applicable
 * top-level Section is Fulfilled; a Journey moves freely between In
 * Progress and Fulfilled, and only Submitted (carried by the caller
 * from the stored journey, never derived) is one-way.
 *
 * [provisional — NAV-33 vs NAV-34] Journey state counts top-level
 * Section statuses (NAV-34), not raw fulfilment presence (NAV-33). The
 * two coincide except for a fulfilment no applicable Section presents —
 * the system-written premium behind the gated Get your quote Section —
 * which this pick deliberately does not count as In Progress. Labelled
 * per graft 2; see the README provisional-settlements register.
 */

export const SUBMITTED = 'submitted'

export const JOURNEY_STATES = Object.freeze([
  NOT_STARTED,
  IN_PROGRESS,
  FULFILLED,
  SUBMITTED
])

export function journeyState(flow, evaluation, options = {}) {
  const { submitted = false } = options
  if (submitted) {
    return SUBMITTED
  }
  const applicable = flow.sections
    .map((section) => containerStatus(section, evaluation, options))
    .filter((status) => status !== NOT_APPLICABLE)
  if (applicable.length === 0) {
    return NOT_STARTED
  }
  if (applicable.every((status) => status === FULFILLED)) {
    return FULFILLED
  }
  if (
    applicable.some((status) => status === FULFILLED || status === IN_PROGRESS)
  ) {
    return IN_PROGRESS
  }
  return NOT_STARTED
}
