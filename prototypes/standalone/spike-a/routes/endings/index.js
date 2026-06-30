import { BASE } from '../../journey/config.js'
import { open, withQuote } from './helpers.js'
import { getQuoteSummary, submitQuoteSummary } from './quote-summary.js'
import {
  getCheckYourAnswers,
  submitCheckYourAnswers
} from './check-your-answers.js'
import { getConfirmation } from './confirmation.js'

/**
 * The three closing pages: quote summary, check your answers, and confirmation.
 */
export function endingsRoutes() {
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: withQuote(getQuoteSummary)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/quote-summary`,
      options: open,
      handler: withQuote(submitQuoteSummary)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: withQuote(getCheckYourAnswers)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/check-your-answers`,
      options: open,
      handler: withQuote(submitCheckYourAnswers)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: withQuote(getConfirmation)
    }
  ]
}
