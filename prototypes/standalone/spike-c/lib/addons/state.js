import { updateQuote } from '../store.js'
import { addonByValue } from './catalog.js'

/**
 * Store-backed add-on state: read the chosen add-ons and their per-add-on
 * answers, persist a selection or a completed step, and derive per-add-on /
 * whole-selection completeness.
 */

export const getSelectedAddons = (quote) => quote.selectedAddons ?? []
export const getAddonData = (quote, value) =>
  (quote.addonData ?? {})[value] ?? {}

export function setSelectedAddons(quote, values) {
  return updateQuote(quote.id, { selectedAddons: values })
}

export function saveAddonStep(quote, value, data) {
  const merged = { ...getAddonData(quote, value), ...data }
  return updateQuote(quote.id, {
    addonData: { ...(quote.addonData ?? {}), [value]: merged }
  })
}

export function stepComplete(step, data) {
  return Boolean(data[step.key])
}

export function addonComplete(quote, value) {
  const addon = addonByValue.get(value)
  const data = getAddonData(quote, value)
  return addon.steps.every((step) => stepComplete(step, data))
}

export function allSelectedAddonsComplete(quote) {
  return getSelectedAddons(quote).every((value) => addonComplete(quote, value))
}
