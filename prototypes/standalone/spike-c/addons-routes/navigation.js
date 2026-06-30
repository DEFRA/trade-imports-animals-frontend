import { addonByValue } from '../lib/addons/index.js'
import { BASE, hubPath, addonStepPath } from '../journey/index.js'

/**
 * Where Back / Continue go for the grouped journey: selection and each add-on
 * task return to the hub; within an add-on you step back to the previous step.
 * `locateStep` resolves the addressed `{ addon, step, index }` from the params.
 */

export const addonsPathFor = (id, suffix) => `${BASE}/${id}/${suffix}`

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

export function locateStep(params) {
  const addon = addonByValue.get(params.addon)
  if (!addon) {
    return null
  }
  const index = addon.steps.findIndex((step) => step.slug === params.step)
  return index === -1 ? null : { addon, step: addon.steps[index], index }
}
