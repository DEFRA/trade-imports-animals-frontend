import { readyForCheckYourAnswers } from '../flow/section-status.js'

// The `readyForCheckYourAnswers` seam, kept in bridge so `bridge/scope.js`
// consumes it as a sibling. The default is the real `flow/section-status.js` fn
// (rolls the task rows up through `rowStatus` / `statusOf`); tests override it
// via `configureReadyForCheckYourAnswers`, which `engine/read.js` re-exports.
// A separate module so neither importer forms a cycle — the graph stays a DAG.

let readyForCheckYourAnswersFn = readyForCheckYourAnswers

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn(answers, inScope, evaluation)
