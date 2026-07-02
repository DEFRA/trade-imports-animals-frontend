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

export function endingsRoutes() {
  const cyaPath = pagePath(flow.checkYourAnswers.slug)
  return [
    {
      method: 'GET',
      path: pagePath('quote-summary'),
      options: options('quote-summary'),
      handler: getQuoteSummary
    },
    {
      method: 'POST',
      path: pagePath('quote-summary'),
      options: options('quote-summary'),
      handler: submitQuoteSummary
    },
    {
      method: 'GET',
      path: cyaPath,
      options: options('check-your-answers'),
      handler: getCheckYourAnswers
    },
    {
      method: 'POST',
      path: cyaPath,
      options: options('check-your-answers'),
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
