import { coverTypeLabel, extrasLabels } from '../lib/quote.js'
import { sectionBySlug } from '../lib/sections/index.js'
import { contract } from '../runtime/contract/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'
import { stepPath, changeHref, rowHref } from './paths.js'

/**
 * The Check Your Answers and Quote Summary view models — answer rows, soft
 * prompts (each still-missing required field with its provenance reason) and the
 * two renderers.
 */

export const QUOTE_SUMMARY_TEMPLATE =
  'standalone/spike-c/templates/quote-summary'
export const CYA_TEMPLATE = 'standalone/spike-c/templates/check-your-answers'

const toSummaryRow = (row, href) => ({
  key: { text: row.key },
  value: { text: row.value },
  actions: {
    items: [{ href, text: 'Change', visuallyHiddenText: row.key.toLowerCase() }]
  }
})

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = rowHref(quote, section, stepId)
    return section.rows(quote).map((row) => toSummaryRow(row, href))
  })

// Soft prompts: each still-missing required field, with its provenance reason.
const softPrompts = (quote) =>
  contract.missingRequired(quote).map((missingField) => ({
    stepId: missingField.stepId,
    text: contract.stepTitle(missingField.stepId),
    because: provenanceText(missingField.because),
    href: changeHref(quote, missingField.stepId)
  }))

export const renderCya = (quote, toolkit, extras = {}) =>
  toolkit.view(CYA_TEMPLATE, {
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

export const renderQuoteSummary = (quote, premium, toolkit) =>
  toolkit.view(QUOTE_SUMMARY_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Your quote',
    quote,
    premium,
    coverLabel: coverTypeLabel(quote.coverType),
    extras: extrasLabels(quote.extras),
    backLink: `${BASE}/${quote.id}`,
    breadcrumbs: breadcrumbs(quote, 'Your quote')
  })

export const errorSummaryRows = (quote, errors) =>
  errors.map((error) => ({
    text: error.message,
    href: changeHref(quote, error.stepId)
  }))

function provenanceText(because) {
  if (!because || because.length === 0) {
    return undefined
  }
  return because.map((entry) => entry.reason ?? describe(entry)).join('; ')
}

function describe(entry) {
  if (entry.field && entry.eq !== undefined) {
    return `${entry.field} = ${entry.eq}`
  }
  return JSON.stringify(entry)
}
