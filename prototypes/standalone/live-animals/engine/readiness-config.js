/**
 * Boot-injected `readyForCheckYourAnswers` registry.
 *
 * Extracted from `engine/read.js` at inc-017a so BOTH scope builders can
 * consume the injected fn without importing each other: `makeScopeA`
 * (engine/read.js) and `makeScopeFromB` (model/bridge/scope.js) each call
 * `computeReadyForCheckYourAnswers` with their own `inScope`. Before this
 * split, `scope.js` imported `makeScopeA` from `read.js` purely to reach the
 * readiness value — a `read.js <-> scope.js` cycle inc-012/013 flagged for
 * M4. Housing the registry here severs that edge (only `read.js -> scope.js`
 * remains — a clean DAG).
 *
 * The injected fn is `flow/section-status.js`'s `readyForCheckYourAnswers`
 * (wired in `routes.js` at boot), which rolls up the task rows through
 * `rowStatus`; under `MODEL=b` that dual-paths to `statusOfFromB`, so the
 * readiness value is B-derived on the `b` path without this module knowing
 * which model is live.
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
