import { fieldsToView } from '../../lib/fields/index.js'
import { getAddonData } from '../../lib/addons/index.js'
import { LAYOUT, breadcrumbs } from '../../journey/config.js'
import { stepBack } from './helpers.js'

// Reshape a raw POST payload into the structure the add-on partials expect —
// date fields back into { day, month, year }, others passed through.
const toFieldEntry = (field, payload) =>
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

function coalesceStepValues(fields, payload) {
  return Object.fromEntries(fields.map((field) => toFieldEntry(field, payload)))
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
