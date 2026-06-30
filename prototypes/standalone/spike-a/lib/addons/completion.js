import { addonByValue } from './catalogue.js'
import { getSelectedAddons, getAddonData } from './selection.js'

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
