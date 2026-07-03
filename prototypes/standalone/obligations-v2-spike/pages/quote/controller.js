import { breadcrumbs, hubPath, pagePath, TEMPLATES } from '../../config.js'
import { open } from '../_shared/kit.js'
import * as state from '../../state/index.js'
import { calculatePremium } from '../../state/quote.js'

/**
 * Your quote — read-only presentation of the system-handled premium. The
 * premium is computed on demand from the current answers (nothing derived
 * is stored). Bespoke by nature; the POST only advances to CYA.
 */
const view = `${TEMPLATES}/pages/quote/template`

const COVER_LABEL = {
  comprehensive: 'Comprehensive',
  'third-party-fire-theft': 'Third party, fire and theft',
  'third-party': 'Third party only'
}
const EXTRA_LABEL = {
  breakdown: 'Breakdown cover',
  'courtesy-car': 'Courtesy car',
  legal: 'Motor legal protection',
  windscreen: 'Windscreen cover'
}

const get = (request, h) => {
  const { answers } = state.get(request, h)
  const extras = [].concat(answers.extras ?? []).map((v) => EXTRA_LABEL[v] ?? v)
  return h.view(view, {
    pageTitle: 'Your quote',
    heading: 'Your quote',
    premium: calculatePremium(answers),
    coverLabel: COVER_LABEL[answers.coverType] ?? '',
    extras,
    backLink: hubPath(),
    breadcrumbs: breadcrumbs('Your quote')
  })
}

const post = (_request, h) => h.redirect(pagePath('check-answers'))

export const routes = [
  {
    method: 'GET',
    path: pagePath('quote-summary'),
    options: open,
    handler: get
  },
  {
    method: 'POST',
    path: pagePath('quote-summary'),
    options: open,
    handler: post
  }
]
