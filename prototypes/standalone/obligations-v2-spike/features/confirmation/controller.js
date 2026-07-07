import { BASE, breadcrumbs, pagePath, TEMPLATES } from '../../config.js'
import { SUBMITTED } from '../../engine/store.js'
import * as state from '../../engine/index.js'
import { calculatePremium, makeReference } from '../../lib/quote.js'
import { open } from '../../shared/kit.js'

const view = `${TEMPLATES}/features/confirmation/template`

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
