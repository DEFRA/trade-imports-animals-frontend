import { findQuote } from '../../lib/store.js'
import { addonByValue } from '../../lib/addons/index.js'
import { BASE, hubPath, addonStepPath } from '../../journey/config.js'

export const ADDONS_SELECT_TEMPLATE =
  'standalone/spike-a/templates/addons-select'
export const ADDON_STEP_TEMPLATE = 'standalone/spike-a/templates/addon-step'

export const addonsPath = (id) => `${BASE}/${id}/addons`

// Where Back / Continue go for the grouped journey: selection and each add-on
// task return to the hub; within an add-on you step back to the previous step.
export const selectionBack = (id) => hubPath(id)
export const afterSelection = (quote) => hubPath(quote.id)
export const stepBack = (quote, value, stepIndex) =>
  stepIndex === 0
    ? hubPath(quote.id)
    : addonStepPath(
        quote.id,
        value,
        addonByValue.get(value).steps[stepIndex - 1].slug
      )
export const afterStep = (quote, value, stepIndex) => {
  const next = addonByValue.get(value).steps[stepIndex + 1]
  return next ? addonStepPath(quote.id, value, next.slug) : hubPath(quote.id)
}

// Load the quote once and short-circuit to BASE when it is missing, so each
// handler receives a resolved quote and never repeats the guard.
export const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  return quote ? handler(quote, request, h) : h.redirect(BASE)
}

export function locateStep(params) {
  const addon = addonByValue.get(params.addon)
  if (!addon) {
    return null
  }
  const index = addon.steps.findIndex((step) => step.slug === params.step)
  return index === -1 ? null : { addon, step: addon.steps[index], index }
}
