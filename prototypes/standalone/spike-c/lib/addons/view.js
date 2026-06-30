import { addonOptions, addonByValue } from './catalog.js'
import { getSelectedAddons, addonComplete } from './state.js'

/**
 * Add-on view/hub helpers: the selection checkboxes, the flat step sequence
 * across chosen add-ons, a per-add-on summary line and the hub task-list items.
 */

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
