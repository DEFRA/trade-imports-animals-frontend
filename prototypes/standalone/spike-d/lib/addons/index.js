import { updateQuote } from '../store.js'
import { addonByValue, addonOptions } from './catalogue.js'

/**
 * The "select 1-to-N options, each opening its own subtasks" pattern. The driver
 * picks any number of policy add-ons (checkboxes); each chosen add-on then has
 * its own independent mini-journey of steps, tracked separately. Unlike the
 * claims loop (many of the same thing), this fans out into different branches.
 *
 * Per-add-on answers live under quote.addonData[value]; the chosen set is
 * quote.selectedAddons.
 */

export { addonByValue, addonOptions }

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

export function selectionItems(quote) {
  const selected = getSelectedAddons(quote)
  return addonOptions.map((addon) => ({
    value: addon.value,
    text: addon.title,
    checked: selected.includes(addon.value)
  }))
}

/** Flat ordered list of every step across selected add-ons (linear journeys). */
export function addonSequence(quote) {
  return getSelectedAddons(quote).flatMap((value) =>
    addonByValue.get(value).steps.map((step) => ({ value, step }))
  )
}

/** A short summary line for an add-on, for the check-answers page. */
export function addonSummary(quote, value) {
  return addonComplete(quote, value) ? 'Added' : 'Started'
}

/**
 * One task-list item per selected add-on, each linking to its own first step —
 * the fan-out, as independent tasks. `firstStepPath(id, value, slug)` builds the
 * variant's URL.
 */
export function addonHubItems(quote, firstStepPath) {
  return getSelectedAddons(quote).map((value) => {
    const addon = addonByValue.get(value)
    return {
      title: { text: addon.title },
      hint: { text: addon.steps.map((step) => step.title).join(', ') },
      href: firstStepPath(quote.id, value, addon.steps[0].slug),
      status: addonComplete(quote, value)
        ? { text: 'Completed' }
        : { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
    }
  })
}
