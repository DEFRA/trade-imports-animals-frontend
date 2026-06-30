import { BASE } from '../journey/index.js'
import {
  withQuote,
  getQuoteSummary,
  postQuoteSummary,
  getCheckYourAnswers,
  postCheckYourAnswers,
  getConfirmation
} from './handlers.js'

/**
 * The closing-page route table: quote summary, check your answers, confirmation.
 * Per-row value formatting is reused from the presentation layer (lib/sections).
 */

const open = { auth: false }

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
      handler: withQuote(postQuoteSummary)
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
      handler: withQuote(postCheckYourAnswers)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/confirmation`,
      options: open,
      handler: getConfirmation
    }
  ]
}
