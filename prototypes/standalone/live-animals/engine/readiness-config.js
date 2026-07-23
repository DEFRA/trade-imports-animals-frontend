import { readyForCheckYourAnswers } from '../flow/section-status.js'

// The `readyForCheckYourAnswers` seam. The default is the real
// `flow/section-status.js` fn (rolls the task rows up through `rowStatus` /
// `statusOf`); tests override it via `configureReadyForCheckYourAnswers`. Held
// here, not in `engine/read.js`, so `bridge/scope.js` can consume it without
// importing `read.js` (which imports `scope.js`) — the module graph stays a DAG.

let readyForCheckYourAnswersFn = readyForCheckYourAnswers

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn(answers, inScope, evaluation)
