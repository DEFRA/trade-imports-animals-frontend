import { sectionBySlug, hasOwnRoutes } from '../lib/sections/index.js'
import { contract } from '../runtime/index.js'
import { LAYOUT, breadcrumbs } from '../journey.js'
import { at, withQuote } from './shared.js'
import { confirmQuote } from './confirmation.js'

const provenanceText = (because) => {
  if (!because || because.length === 0) {
    return undefined
  }
  return because.map((entry) => entry.reason ?? describe(entry)).join('; ')
}

const describe = (entry) => {
  if (entry.field && entry.eq !== undefined) {
    return `${entry.field} = ${entry.eq}`
  }
  return JSON.stringify(entry)
}

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
const changeHref = (quote, stepId) => {
  const stepHref = at(quote.id, stepId)
  return contract.stepKind(stepId) ? stepHref : `${stepHref}?change=1`
}

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = hasOwnRoutes(section)
      ? at(quote.id, stepId)
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
  contract.missingRequired(quote).map((missingField) => ({
    stepId: missingField.stepId,
    text: contract.stepTitle(missingField.stepId),
    because: provenanceText(missingField.because),
    href: changeHref(quote, missingField.stepId)
  }))

const buildErrorSummary = (quote, errors) =>
  errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

const renderCya = (quote, responseToolkit, extras = {}) =>
  responseToolkit.view('standalone/spike-d/templates/check-your-answers', {
    layout: LAYOUT,
    pageTitle: 'Check your answers',
    quote,
    premium: quote.premium,
    rows: answerRows(quote),
    incomplete: softPrompts(quote),
    backLink: at(quote.id, 'quote-summary'),
    breadcrumbs: breadcrumbs(quote, 'Check your answers'),
    ...extras
  })

export const checkYourAnswersGet = withQuote(
  (quote, request, responseToolkit) => renderCya(quote, responseToolkit)
)

export const checkYourAnswersPost = withQuote(
  (quote, request, responseToolkit) => {
    // Hard gate: assemble + transform + validate the full quote object.
    const result = contract.assembleQuote(quote)
    if (!result.ok) {
      return renderCya(quote, responseToolkit, {
        errorSummary: buildErrorSummary(quote, result.errors)
      })
    }
    confirmQuote(quote)
    return responseToolkit.redirect(at(quote.id, 'confirmation'))
  }
)
