import { currentJourney, resumeByUser } from './journey.js'
import { reconcile } from './evaluate/reconcile.js'

/**
 * Handed in at boot via `configureReadyForQuote`; the default THROWS: an
 * unconfigured `makeScope` is a hard, loud failure, never a silent wrong
 * answer.
 */
let readyForQuoteFn = () => {
  throw new Error(
    'readyForQuote not configured — call configureReadyForQuote() at boot'
  )
}

export const configureReadyForQuote = (computeReadyForQuote) => {
  readyForQuoteFn = computeReadyForQuote
}

export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    readyForQuote: readyForQuoteFn(answers, inScope)
  }
}

/**
 * `scope` is always rebuilt fresh by `reconcile` from the journey's answers —
 * nothing derived is ever read back from the record.
 */
const readViewOf = (journey) => ({
  journey,
  answers: journey.answers,
  scope: makeScope(journey.answers)
})

export const get = (request, h) => readViewOf(currentJourney(request, h))

export const resume = (request, h) => readViewOf(resumeByUser(request, h))
