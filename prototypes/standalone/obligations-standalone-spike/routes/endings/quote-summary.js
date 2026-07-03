import { applyAnswers, evaluate, modelJson } from '../../contract/index.js'
import {
  breadcrumbs,
  currentJourney,
  hubPath,
  LAYOUT,
  pagePath,
  TEMPLATES
} from '../../journey/index.js'

/**
 * 'Your quote' — read-only presentation of the system-handled quote
 * result. The premium is read from an orchestrated evaluation: the quote
 * handler fires on scope entry DURING the fixed-point pass, never at
 * submit, so a direct-URL visit prices a half-empty journey (Rulings
 * item 2). The POST only redirects on to CYA — it never writes.
 */

const flow = JSON.parse(modelJson().flow)
const collectPages = (container) =>
  container.kind === 'page'
    ? [container]
    : (container.children ?? []).flatMap(collectPages)
const pages = flow.sections.flatMap(collectPages)
const page = pages.find((candidate) => candidate.id === 'quote-summary')
const coverEntry = pages.find((candidate) => candidate.id === 'cover-type')
  .presents[0]
const extrasEntry = pages.find(
  (candidate) => candidate.id === 'optional-extras'
).presents[0]
const premiumId = page.presents[0].obligation

/**
 * Price the journey by URL: an empty-payload save answers nothing but
 * still runs write -> fixed point -> save, firing the quote handler over
 * whatever is answered so far. A submitted journey is frozen (its store
 * rejects writes) and re-reads the premium it already stored.
 */
const pricedEvaluation = (journey) => {
  const evaluation = evaluate(journey)
  return evaluation.submitted
    ? evaluation
    : applyAnswers(journey, page.id, {}).evaluation
}

const optionLabel = (entry, value) =>
  (entry.options ?? []).find((option) => option.value === value)?.label

export const getQuoteSummary = (request, h) => {
  const journey = currentJourney(request, h)
  const evaluation = pricedEvaluation(journey)
  const stored = evaluation.fulfilments
  const extras = []
    .concat(stored[extrasEntry.obligation]?.value ?? [])
    .map((value) => optionLabel(extrasEntry, value) ?? value)
  return h.view(`${TEMPLATES}/quote-summary`, {
    layout: LAYOUT,
    pageTitle: page.heading,
    heading: page.heading,
    premium: stored[premiumId]?.value,
    coverLabel:
      optionLabel(coverEntry, stored[coverEntry.obligation]?.value) ?? '',
    extras,
    quoteCopy: page.quoteCopy,
    buttonText: page.buttonText,
    backLink: hubPath(),
    breadcrumbs: breadcrumbs(page.heading)
  })
}

export const submitQuoteSummary = (request, h) => {
  currentJourney(request, h)
  return h.redirect(pagePath(flow.checkYourAnswers.slug))
}
