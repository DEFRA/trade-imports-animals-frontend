import { evaluate, modelJson } from '../../contract/index.js'
import {
  BASE,
  breadcrumbs,
  currentJourney,
  LAYOUT,
  TEMPLATES
} from '../../journey/index.js'

/**
 * 'Quote confirmed' — the terminal panel every shared spec ends on, and
 * the one route status-guarded in BOTH paradigms (spike-a parity): a
 * pre-submit visit redirects to the start page. The reference is
 * deterministic (CI- + journeyId hex), so a page refresh re-renders the
 * identical confirmation.
 */

const QUOTE_SECTION_ID = 'get-your-quote'
const QUOTE_SUMMARY_ID = 'quote-summary'

const flow = JSON.parse(modelJson().flow)
const premiumId = flow.sections
  .find((section) => section.id === QUOTE_SECTION_ID)
  .children.find((child) => child.id === QUOTE_SUMMARY_ID)
  .presents[0].obligation

export const getConfirmation = (request, h) => {
  const journey = currentJourney(request, h)
  const evaluation = evaluate(journey)
  if (!evaluation.submitted) return h.redirect(BASE)
  return h.view(`${TEMPLATES}/confirmation`, {
    layout: LAYOUT,
    pageTitle: flow.confirmation.panelTitle,
    confirmation: flow.confirmation,
    reference: evaluation.reference,
    premium: evaluation.fulfilments[premiumId]?.value,
    breadcrumbs: breadcrumbs(flow.confirmation.panelTitle)
  })
}
