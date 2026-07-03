import { cyaRows, evaluate, modelJson } from '../../contract/index.js'
import {
  breadcrumbs,
  currentJourney,
  LAYOUT,
  pagePath,
  TEMPLATES
} from '../../journey/index.js'

/**
 * Check your answers. Open by URL pre-submit (Rulings item 2): a
 * mid-journey GET renders the rows priced so far plus the soft "you
 * still need to..." prompts — the hard gate lives at the POST
 * (routes/endings/submit.js). Post-submit it is the read-only survivor:
 * the contract drops row actions and `submitted` hides the send form
 * (Rulings item 1). `renderCya` is shared with the submit stale-recheck
 * re-render.
 */

const GET_YOUR_QUOTE_SECTION_ID = 'get-your-quote'
const QUOTE_SUMMARY_ID = 'quote-summary'

const flow = JSON.parse(modelJson().flow)
const cya = flow.checkYourAnswers
const premiumId = flow.sections
  .find((section) => section.id === GET_YOUR_QUOTE_SECTION_ID)
  .children.find((child) => child.id === QUOTE_SUMMARY_ID)
  .presents[0].obligation

/** Render CYA from one evaluation; `extras` carries the stale-recheck
 * error summary. */
export const renderCya = (evaluation, h, extras = {}) => {
  const { rows, prompts } = cyaRows(evaluation)
  return h.view(`${TEMPLATES}/check-your-answers`, {
    layout: LAYOUT,
    pageTitle: cya.heading,
    heading: cya.heading,
    rows,
    prompts,
    bannerHeading: cya.bannerHeading,
    premium: evaluation.fulfilments[premiumId]?.value,
    premiumLead: cya.premiumLead,
    sendHeading: cya.sendHeading,
    sendBody: cya.sendBody,
    buttonText: cya.buttonText,
    submitted: evaluation.submitted,
    errorSummaryTitle: flow.defaults.errorSummaryTitle,
    backLink: pagePath(QUOTE_SUMMARY_ID),
    breadcrumbs: breadcrumbs(cya.heading),
    ...extras
  })
}

export const getCheckYourAnswers = (request, h) => {
  const journey = currentJourney(request, h)
  return renderCya(evaluate(journey), h)
}
