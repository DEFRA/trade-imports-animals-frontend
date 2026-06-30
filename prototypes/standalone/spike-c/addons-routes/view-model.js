import { fieldsToView } from '../lib/field-view/index.js'
import { getAddonData } from '../lib/addons/index.js'
import { LAYOUT, breadcrumbs } from '../journey/index.js'
import { stepBack } from './navigation.js'

/** The add-on step view model, plus the raw-payload reshape it relies on. */

// Reshape a raw POST payload into the structure the add-on partials expect —
// date fields back into { day, month, year }, others passed through.
function coalesceStepValues(fields, payload) {
  const toEntry = (field) =>
    field.kind === 'date'
      ? [
          field.name,
          {
            day: payload[`${field.name}-day`],
            month: payload[`${field.name}-month`],
            year: payload[`${field.name}-year`]
          }
        ]
      : [field.name, payload[field.name]]
  return Object.fromEntries(fields.map(toEntry))
}

export function stepViewModel(quote, found, extras = {}) {
  const fieldValues = extras.values
    ? coalesceStepValues(found.step.fields, extras.values)
    : getAddonData(quote, found.addon.value)
  return {
    layout: LAYOUT,
    pageTitle: found.step.title,
    fields: fieldsToView(found.step.fields, fieldValues, extras.errors ?? null),
    backLink: stepBack(quote, found.addon.value, found.index),
    breadcrumbs: breadcrumbs(quote, found.step.title),
    ...extras
  }
}
