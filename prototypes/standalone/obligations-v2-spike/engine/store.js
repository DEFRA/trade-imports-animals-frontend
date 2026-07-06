import { records } from './persistence/records.js'

/**
 * COMPAT SHIM — the old `store` surface, re-expressed over the RECORDS port
 * (`persistence/records.js`). Kept so the three pre-reshape consumers stay
 * byte-green with ZERO test edits: `store-ops.test.js` (zero-arg `store.create()`
 * + `store.get(journeyId).answers`), `contract.test.js` (drive-through-store),
 * and `confirmation/controller.js` (imports SUBMITTED). New code imports the
 * ports directly; this shim exists only for the legacy surface.
 */
export { IN_PROGRESS, SUBMITTED } from './persistence/records.js'

export const store = {
  create: (opts) => records.create(opts),
  get: (journeyId) => records.load({ journeyId }),
  has: records.has,
  saveAnswers: records.saveAnswers,
  submit: records.finalise,
  clear: records.clear
}
