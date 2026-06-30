import { BASE } from '../journey.js'
import { open } from './shared.js'
import { quoteSummaryGet, quoteSummaryPost } from './quote-summary.js'
import {
  checkYourAnswersGet,
  checkYourAnswersPost
} from './check-your-answers.js'
import { confirmationGet } from './confirmation.js'

/**
 * The three closing pages. Quote summary and confirmation match the rest of the
 * journey; Check Your Answers is the interesting one:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 * Per-row value formatting is reused from the presentation layer (lib/sections).
 */
export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: quoteSummaryGet
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: quoteSummaryPost
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: checkYourAnswersGet
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: checkYourAnswersPost
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: confirmationGet
    }
  ]
}
