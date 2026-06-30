import { contract } from '../runtime/contract.js'
import { sectionBySlug, hasOwnRoutes } from '../lib/sections/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'

/**
 * Check-your-answers view builders. On LOAD the page is soft —
 * `contract.missingRequired` drives the "you still need to…" prompts; the row
 * list itself reuses each section's per-row value formatting (lib/sections).
 */

const CHANGE_LABEL = 'Change'
const CHANGE_QUERY = '?change=1'

export const at = (id, slug) => `${BASE}/${id}/${slug}`

// Simple question pages round-trip via ?change=1; loops / fan-outs link to their
// own first page and return through their own flow.
export const changeHref = (quote, stepId) => {
  const stepUrl = at(quote.id, stepId)
  return contract.stepKind(stepId) ? stepUrl : `${stepUrl}${CHANGE_QUERY}`
}

const rowHref = (quote, section, stepId) =>
  hasOwnRoutes(section) ? at(quote.id, stepId) : changeHref(quote, stepId)

const toSummaryRow = (href, row) => ({
  key: { text: row.key },
  value: { text: row.value },
  actions: {
    items: [
      { href, text: CHANGE_LABEL, visuallyHiddenText: row.key.toLowerCase() }
    ]
  }
})

const answerRows = (quote) =>
  contract.applicableSteps(quote).flatMap((stepId) => {
    const section = sectionBySlug.get(stepId)
    if (!section) {
      return []
    }
    const href = rowHref(quote, section, stepId)
    return section.rows(quote).map((row) => toSummaryRow(href, row))
  })

// Soft prompts: each still-missing required field, with its provenance reason.
const softPrompts = (quote) =>
  contract.missingRequired(quote).map((miss) => ({
    stepId: miss.stepId,
    text: contract.stepTitle(miss.stepId),
    because: provenanceText(miss.because),
    href: changeHref(quote, miss.stepId)
  }))

export const renderCya = (quote, responseToolkit, extras = {}) =>
  responseToolkit.view('standalone/spike-b/templates/check-your-answers', {
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
