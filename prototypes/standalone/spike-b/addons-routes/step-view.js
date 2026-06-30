import { addonByValue, getAddonData } from '../lib/addons/index.js'
import { fieldsToView } from '../lib/fields/index.js'
import {
  BASE,
  LAYOUT,
  breadcrumbs,
  hubPath,
  addonStepPath
} from '../journey/index.js'

/**
 * Add-on step helpers — locate the requested add-on step from the route params,
 * reshape a raw POST payload into the structure the partials expect, build the
 * step's view model, and resolve where Back / Continue go for the grouped
 * journey (selection and each add-on task return to the hub; within an add-on
 * you step back to the previous step).
 */

export const at = (id, suffix) => `${BASE}/${id}/${suffix}`

export const selectionBack = (id) => hubPath(id)
export const afterSelection = (quote) => hubPath(quote.id)

const stepBack = (quote, value, stepIndex) =>
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

// Reshape a raw POST payload into the structure the add-on partials expect —
// date fields back into { day, month, year }, others passed through.
function coalesceStepValues(fields, payload) {
  const data = {}
  for (const field of fields) {
    if (field.kind === 'date') {
      data[field.name] = {
        day: payload[`${field.name}-day`],
        month: payload[`${field.name}-month`],
        year: payload[`${field.name}-year`]
      }
    } else {
      data[field.name] = payload[field.name]
    }
  }
  return data
}

export function stepViewModel(quote, found, extras = {}) {
  const data = extras.values
    ? coalesceStepValues(found.step.fields, extras.values)
    : getAddonData(quote, found.addon.value)
  return {
    layout: LAYOUT,
    pageTitle: found.step.title,
    fields: fieldsToView(found.step.fields, data, extras.errors ?? null),
    backLink: stepBack(quote, found.addon.value, found.index),
    breadcrumbs: breadcrumbs(quote, found.step.title),
    ...extras
  }
}
