import { findQuote } from '../lib/store.js'
import { fieldsToView, collectFields } from '../lib/fields.js'
import { validatePayload } from '../lib/validate/index.js'
import {
  addonByValue,
  getAddonData,
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from '../lib/addons.js'
import {
  BASE,
  LAYOUT,
  breadcrumbs,
  hubPath,
  addonStepPath
} from '../journey/config.js'

/**
 * "Add to your policy" — pick 0..N add-ons (checkboxes); each chosen add-on then
 * has its own short sub-journey of steps. In this task-list journey each add-on
 * is its own task that returns to the hub when finished. URL scheme:
 *   {base}/{id}/addons                    pick add-ons
 *   {base}/{id}/addons/{addon}/{step}     one step of a chosen add-on
 */

const ADDONS_SELECT_TEMPLATE = 'standalone/spike-a/templates/addons-select'
const ADDON_STEP_TEMPLATE = 'standalone/spike-a/templates/addon-step'

const addonsPath = (id) => `${BASE}/${id}/addons`

// Where Back / Continue go for the grouped journey: selection and each add-on
// task return to the hub; within an add-on you step back to the previous step.
const selectionBack = (id) => hubPath(id)
const afterSelection = (quote) => hubPath(quote.id)
const stepBack = (quote, value, stepIndex) =>
  stepIndex === 0
    ? hubPath(quote.id)
    : addonStepPath(
        quote.id,
        value,
        addonByValue.get(value).steps[stepIndex - 1].slug
      )
const afterStep = (quote, value, stepIndex) => {
  const next = addonByValue.get(value).steps[stepIndex + 1]
  return next ? addonStepPath(quote.id, value, next.slug) : hubPath(quote.id)
}

// Load the quote once and short-circuit to BASE when it is missing, so each
// handler receives a resolved quote and never repeats the guard.
const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  return quote ? handler(quote, request, h) : h.redirect(BASE)
}

function locateStep(params) {
  const addon = addonByValue.get(params.addon)
  if (!addon) {
    return null
  }
  const index = addon.steps.findIndex((step) => step.slug === params.step)
  return index === -1 ? null : { addon, step: addon.steps[index], index }
}

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

function stepViewModel(quote, found, extras = {}) {
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

const renderAddonsSelect = (quote, request, h) =>
  h.view(ADDONS_SELECT_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })

const submitAddonsSelect = (quote, request, h) => {
  const raw = request.payload.addons
  const values = raw === undefined ? [] : [].concat(raw)
  const updated = setSelectedAddons(quote, values)
  return h.redirect(afterSelection(updated))
}

const renderAddonStep = (quote, request, h) => {
  const found = locateStep(request.params)
  if (!found) {
    return h.redirect(addonsPath(quote.id))
  }
  return h.view(ADDON_STEP_TEMPLATE, stepViewModel(quote, found))
}

const renderStepErrors = (quote, found, payload, validation, h) =>
  h.view(
    ADDON_STEP_TEMPLATE,
    stepViewModel(quote, found, {
      errors: validation.errors,
      errorSummary: validation.errorSummary,
      values: payload
    })
  )

const persistAddonStep = (quote, found, value, h) => {
  const updated = saveAddonStep(
    quote,
    found.addon.value,
    collectFields(found.step.fields, value)
  )
  return h.redirect(afterStep(updated, found.addon.value, found.index))
}

const submitAddonStep = (quote, request, h) => {
  const found = locateStep(request.params)
  if (!found) {
    return h.redirect(addonsPath(quote.id))
  }
  const validation = validatePayload(found.step.schema, request.payload)
  if (validation.errors) {
    return renderStepErrors(quote, found, request.payload, validation, h)
  }
  return persistAddonStep(quote, found, validation.value, h)
}

export function addonsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(renderAddonsSelect)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(submitAddonsSelect)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withQuote(renderAddonStep)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withQuote(submitAddonStep)
    }
  ]
}
