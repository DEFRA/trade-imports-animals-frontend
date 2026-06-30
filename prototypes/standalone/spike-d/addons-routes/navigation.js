import { addonByValue } from '../lib/addons/index.js'
import { BASE, hubPath, addonStepPath } from '../journey.js'

export const ADDON_STEP_VIEW = 'standalone/spike-d/templates/addon-step'
export const ADDONS_SELECT_VIEW = 'standalone/spike-d/templates/addons-select'

export const at = (id, suffix) => `${BASE}/${id}/${suffix}`

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
