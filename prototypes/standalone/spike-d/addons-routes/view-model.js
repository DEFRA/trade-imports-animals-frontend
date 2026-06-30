import { fieldsToView } from '../lib/fields/index.js'
import { addonByValue, getAddonData } from '../lib/addons/index.js'
import { LAYOUT, breadcrumbs } from '../journey.js'
import { stepBack } from './navigation.js'

export function locateStep(params) {
  const addon = addonByValue.get(params.addon)
  if (!addon) {
    return null
  }
  const index = addon.steps.findIndex((step) => step.slug === params.step)
  return index === -1 ? null : { addon, step: addon.steps[index], index }
}

// Reshape a raw POST payload into the structure the add-on partials expect —
// date fields back into { day, month, year }, others passed through.
function coalesceStepValues(fields, payload) {
  const stepValues = {}
  for (const field of fields) {
    if (field.kind === 'date') {
      stepValues[field.name] = {
        day: payload[`${field.name}-day`],
        month: payload[`${field.name}-month`],
        year: payload[`${field.name}-year`]
      }
    } else {
      stepValues[field.name] = payload[field.name]
    }
  }
  return stepValues
}

export function stepViewModel(quote, found, extras = {}) {
  const currentValues = extras.values
    ? coalesceStepValues(found.step.fields, extras.values)
    : getAddonData(quote, found.addon.value)
  return {
    layout: LAYOUT,
    pageTitle: found.step.title,
    fields: fieldsToView(
      found.step.fields,
      currentValues,
      extras.errors ?? null
    ),
    backLink: stepBack(quote, found.addon.value, found.index),
    breadcrumbs: breadcrumbs(quote, found.step.title),
    ...extras
  }
}
