import { updateQuote } from '../../lib/store.js'
import { makeReference } from '../../lib/quote.js'
import { sectionBySlug, hasOwnRoutes } from '../../lib/sections/index.js'
import { contract } from '../../runtime/selectors/index.js'
import { LAYOUT, breadcrumbs } from '../../journey/config.js'
import { STATUS_QUOTED, stepPath, changeHref } from './helpers.js'
import { provenanceText } from './provenance.js'

/**
 * Check Your Answers — the interesting closing page:
 *   - on LOAD  → soft: contract.missingRequired drives "you still need to…".
 *   - on SUBMIT → hard: contract.assembleQuote validates + transforms the whole
 *     quote (incl. a holistic business rule) and gates the route to confirmation.
 * Per-row value formatting is reused from the presentation layer (lib/sections).
 */

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = hasOwnRoutes(section)
      ? stepPath(quote.id, stepId)
      : changeHref(quote, stepId)
    return section.rows(quote).map((row) => ({
      key: { text: row.key },
      value: { text: row.value },
      actions: {
        items: [
          { href, text: 'Change', visuallyHiddenText: row.key.toLowerCase() }
        ]
      }
    }))
  })

// Soft prompts: each still-missing required field, with its provenance reason.
const softPrompts = (quote) =>
  contract.missingRequired(quote).map((missing) => ({
    stepId: missing.stepId,
    text: contract.stepTitle(missing.stepId),
    because: provenanceText(missing.because),
    href: changeHref(quote, missing.stepId)
  }))

const errorRows = (result, quote) =>
  result.errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const markQuoted = (quote) =>
  updateQuote(quote.id, {
    status: STATUS_QUOTED,
    reference: makeReference(quote.id)
  })

const renderCya = (quote, h, extras = {}) =>
  h.view('standalone/spike-a/templates/check-your-answers', {
    layout: LAYOUT,
    pageTitle: 'Check your answers',
    quote,
    premium: quote.premium,
    rows: answerRows(quote),
    incomplete: softPrompts(quote),
    backLink: stepPath(quote.id, 'quote-summary'),
    breadcrumbs: breadcrumbs(quote, 'Check your answers'),
    ...extras
  })

export const getCheckYourAnswers = (quote, request, h) => renderCya(quote, h)

export const submitCheckYourAnswers = (quote, request, h) => {
  // Hard gate: assemble + transform + validate the full quote object.
  const result = contract.assembleQuote(quote)
  if (!result.ok) {
    return renderCya(quote, h, { errorSummary: errorRows(result, quote) })
  }
  markQuoted(quote)
  return h.redirect(stepPath(quote.id, 'confirmation'))
}
