import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { currentSetId, setKeyed } from '../shared/set-context.js'

// The `readyForCheckYourAnswers` seam, kept in bridge so `bridge/scope.js`
// consumes it as a sibling. The default is the real `flow/section-status.js` fn
// (rolls the task rows up through `rowStatus` / `statusOf`); tests override it
// via `configureReadyForCheckYourAnswers`, which `engine/read.js` re-exports.
// A separate module so neither importer forms a cycle — the graph stays a DAG.

const store = setKeyed('Ready-for-check-your-answers')

export const configureReadyForCheckYourAnswers = (setId, compute) => {
  store.configure(setId, compute)
}

// A set that configures nothing gets the real roll-up, so this resolves to the
// default rather than throwing the way a required seam does.
const readyForCheckYourAnswersFn = () =>
  store.has(currentSetId()) ? store.current() : readyForCheckYourAnswers

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn()(answers, inScope, evaluation)
