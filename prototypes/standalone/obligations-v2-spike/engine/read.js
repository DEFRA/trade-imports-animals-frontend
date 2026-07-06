import { currentJourney } from './journey.js'
import { reconcile } from './reconcile.js'

/**
 * The READ side of the narrow state facade: load-or-create the journey and
 * expose read-only scope facts. Scope is derived by `reconcile` alone; a page
 * physically cannot hand-roll a wipe or fake scope.
 *
 * The quote-readiness roll-up lives in `flow/section-status.js` (it needs the
 * boot-built dispatch index and the flow's section list — knowledge the engine
 * must not import). It is handed IN at boot via `configureReadyForQuote`, a
 * downward flow -> engine data hand-off, so the engine keeps ZERO `flow/`
 * imports. The default THROWS: an unconfigured `makeScope` is a hard, loud
 * failure, never a silent wrong answer.
 */
let readyForQuoteFn = () => {
  throw new Error(
    'readyForQuote not configured — call configureReadyForQuote() at boot'
  )
}

export const configureReadyForQuote = (fn) => {
  readyForQuoteFn = fn
}

/** Read-only scope facts, computed fresh from the answers map. */
export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    readyForQuote: readyForQuoteFn(answers, inScope)
  }
}

/** { journey, answers, scope } for a request (load-or-create). */
export const get = (request, h) => {
  const journey = currentJourney(request, h)
  return {
    journey,
    answers: journey.answers,
    scope: makeScope(journey.answers)
  }
}
