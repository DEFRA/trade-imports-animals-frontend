import { modelJson } from '../../contract/index.js'
import { pagePath } from '../../journey/index.js'
import { getCheckYourAnswers } from './check-your-answers.js'
import { getConfirmation } from './confirmation.js'
import { getQuoteSummary, submitQuoteSummary } from './quote-summary.js'
import { submitCheckYourAnswers } from './submit.js'

/**
 * The four ending surfaces: quote summary, check your answers, the CYA
 * submit POST and confirmation (no POST — a confirmation refresh is a
 * plain re-render). CYA and confirmation live OUTSIDE the Container tree
 * (flow.json top-level constructs); their slugs come from there.
 */

const flow = JSON.parse(modelJson().flow)

const options = (surface) => ({ auth: false, app: { surface, pageId: null } })

const QUOTE_SUMMARY = 'quote-summary'
const CHECK_YOUR_ANSWERS = 'check-your-answers'

export const endingsRoutes = () => {
  const cyaPath = pagePath(flow.checkYourAnswers.slug)
  return [
    {
      method: 'GET',
      path: pagePath(QUOTE_SUMMARY),
      options: options(QUOTE_SUMMARY),
      handler: getQuoteSummary
    },
    {
      method: 'POST',
      path: pagePath(QUOTE_SUMMARY),
      options: options(QUOTE_SUMMARY),
      handler: submitQuoteSummary
    },
    {
      method: 'GET',
      path: cyaPath,
      options: options(CHECK_YOUR_ANSWERS),
      handler: getCheckYourAnswers
    },
    {
      method: 'POST',
      path: cyaPath,
      options: options(CHECK_YOUR_ANSWERS),
      handler: submitCheckYourAnswers
    },
    {
      method: 'GET',
      path: pagePath(flow.confirmation.slug),
      options: options('confirmation'),
      handler: getConfirmation
    }
  ]
}
