import { breadcrumbs, LAYOUT, pagePath } from '../config.js'
import { nextInSection } from '../flow/navigation.js'

/**
 * The shared per-page LIBRARY — small, independently-callable helpers a
 * controller calls; NEVER a framework that calls the controller. None of
 * these accepts a template name or a field schema and renders: the moment
 * a helper wants to own WHAT renders it has crossed from library to engine
 * and is rejected. Controllers keep their own GET/POST, validation and
 * view-model; they call kit only for the genuinely-uniform mechanical bits.
 */
export const open = { auth: false }

export const CYA_SLUG = 'check-answers'

/**
 * Derives a page's collected obligation ids from the real obligation objects —
 * reference, not string coincidence. The default for a page that collects its
 * feature's whole non-system obligation set.
 */
export const collectsFrom = (obligations) =>
  obligations.filter((o) => !o.system).map((o) => o.id)

/** GDS error summary from a `{ fieldId: message }` map (null when clean). */
export const errorSummary = (fieldErrors) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) return null
  return {
    titleText: 'There is a problem',
    errorList: entries.map(([field, text]) => ({ text, href: `#${field}` }))
  }
}

/** Field-level govuk errorMessage for a widget, or undefined when clean. */
export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

/** Where a valid save goes: back to CYA on a `?change=1` edit, else the
 * next applicable page in this section (or the hub). */
export const nextTarget = (request, page, scope) =>
  request.query.change ? pagePath(CYA_SLUG) : nextInSection(page.id, scope)

/** Base view context (layout, title, breadcrumbs, back link). */
export const base = (title, { backLink } = {}) => ({
  layout: LAYOUT,
  pageTitle: title,
  breadcrumbs: breadcrumbs(title),
  backLink
})

/** GET/POST route pair for a page. */
export const pageRoutes = (page, { get, post }) => [
  { method: 'GET', path: pagePath(page.slug), options: open, handler: get },
  { method: 'POST', path: pagePath(page.slug), options: open, handler: post }
]

/** Read a govuk date-input's three parts from a payload into { day, month, year }. */
export const readDate = (payload, name) => ({
  day: (payload[`${name}-day`] ?? '').trim(),
  month: (payload[`${name}-month`] ?? '').trim(),
  year: (payload[`${name}-year`] ?? '').trim()
})

/** Assemble govukDateInput args (view-model, rendered by the page template). */
export const dateField = (name, { label, hint, value = {}, error } = {}) => {
  const width = (n) =>
    `govuk-input--width-${n}${error ? ' govuk-input--error' : ''}`
  return {
    id: name,
    namePrefix: name,
    fieldset: { legend: { text: label, classes: 'govuk-fieldset__legend--s' } },
    hint: hint ? { text: hint } : undefined,
    errorMessage: error ? { text: error } : undefined,
    items: [
      { name: 'day', classes: width(2), value: value.day },
      { name: 'month', classes: width(2), value: value.month },
      { name: 'year', classes: width(4), value: value.year }
    ]
  }
}
