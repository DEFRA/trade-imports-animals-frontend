import { breadcrumbs, LAYOUT, pagePath } from '../config.js'
import { nextInSection } from '../flow/navigation.js'

export const open = { auth: false }

export const CYA_SLUG = 'notification-view'

export const collectsFrom = (obligations) =>
  obligations
    .filter((obligation) => !obligation.system)
    .map((obligation) => obligation.id)

export const errorSummary = (fieldErrors) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) return null
  return {
    titleText: 'There is a problem',
    errorList: entries.map(([field, text]) => ({ text, href: `#${field}` }))
  }
}

export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined

export const nextTarget = (request, page, scope) =>
  request.query.change ? pagePath(CYA_SLUG) : nextInSection(page.id, scope)

export const base = (title, { backLink } = {}) => ({
  layout: LAYOUT,
  pageTitle: title,
  breadcrumbs: breadcrumbs(title),
  backLink
})

export const pageRoutes = (page, { get, post }) => [
  { method: 'GET', path: pagePath(page.slug), options: open, handler: get },
  { method: 'POST', path: pagePath(page.slug), options: open, handler: post }
]

export const readDate = (payload, name) => ({
  day: (payload[`${name}-day`] ?? '').trim(),
  month: (payload[`${name}-month`] ?? '').trim(),
  year: (payload[`${name}-year`] ?? '').trim()
})

export const dateField = (name, { label, hint, value = {}, error } = {}) => {
  const width = (charWidth) =>
    `govuk-input--width-${charWidth}${error ? ' govuk-input--error' : ''}`
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
