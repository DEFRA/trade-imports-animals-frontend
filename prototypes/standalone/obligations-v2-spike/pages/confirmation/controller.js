import { BASE, breadcrumbs, pagePath, TEMPLATES } from '../../config.js'
import { SUBMITTED } from '../../state/store.js'
import * as state from '../../state/index.js'
import { calculatePremium, makeReference } from '../../state/quote.js'
import { open } from '../_shared/kit.js'

/**
 * Confirmation — the 'Quote confirmed' panel every shared spec ends on,
 * and the one status-guarded route: a pre-submit visit redirects to the
 * start page. The reference is deterministic, so a refresh re-renders the
 * identical confirmation.
 */
const view = `${TEMPLATES}/pages/confirmation/template`

const get = (request, h) => {
  const { journey, answers } = state.get(request, h)
  if (journey.status !== SUBMITTED) return h.redirect(BASE)
  return h.view(view, {
    pageTitle: 'Quote confirmed',
    reference: makeReference(journey.journeyId),
    premium: calculatePremium(answers),
    returnHref: '/prototype-standalone',
    breadcrumbs: breadcrumbs('Quote confirmed')
  })
}

export const routes = [
  { method: 'GET', path: pagePath('confirmation'), options: open, handler: get }
]
