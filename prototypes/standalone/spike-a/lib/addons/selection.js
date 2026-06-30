import { updateQuote } from '../store.js'

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
