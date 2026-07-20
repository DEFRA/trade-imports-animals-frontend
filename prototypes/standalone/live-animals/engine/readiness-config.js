/**
 * Boot-injected `readyForCheckYourAnswers` registry.
 *
 * Housed here (not in `engine/read.js`) so `bridge/scope.js`'s `makeScope`
 * can consume the injected fn without importing `read.js` — keeping the module
 * graph a clean DAG (`read.js -> scope.js`, no cycle).
 *
 * The injected fn is `flow/section-status.js`'s `readyForCheckYourAnswers`
 * (wired in `routes.js` at boot), which rolls up the task rows through
 * `rowStatus` / `statusOf`, so the readiness value is derived without this
 * module reaching back into the scope builder.
 */

let readyForCheckYourAnswersFn = () => {
  throw new Error(
    'readyForCheckYourAnswers not configured — call ' +
      'configureReadyForCheckYourAnswers() at boot'
  )
}

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

export const computeReadyForCheckYourAnswers = (answers, inScope) =>
  readyForCheckYourAnswersFn(answers, inScope)
