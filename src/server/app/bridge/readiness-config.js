import { currentSetId, setKeyed } from '../shared/set-context.js'

// The `readyForCheckYourAnswers` seam, kept in bridge so `bridge/scope.js`
// consumes it as a sibling. L1 injects the real roll-up at boot — each set's
// gateway passes `flow/section-status.js`'s `readyForCheckYourAnswers`, which
// rolls the task rows up through `rowStatus` / `statusOf`; tests override it
// the same way, via `configureReadyForCheckYourAnswers`, which
// `engine/read.js` re-exports. The default is fail-closed, so a forgotten
// injection holds the submit gate shut rather than opening it silently.
// A separate module so neither importer forms a cycle — the graph stays a DAG.

const FAIL_CLOSED = () => false

const store = setKeyed('Ready-for-check-your-answers', {
  configuredBy: 'configureReadyForCheckYourAnswers'
})

export const configureReadyForCheckYourAnswers = (setId, compute) => {
  store.configure(setId, compute)
}

// A set that has not injected the roll-up keeps the gate shut, so this resolves
// to the fail-closed default rather than throwing.
const readyForCheckYourAnswersFn = () =>
  store.has(currentSetId()) ? store.current() : FAIL_CLOSED

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn()(answers, inScope, evaluation)
