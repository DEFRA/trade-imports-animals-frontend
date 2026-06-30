import { findQuote } from './lib/store.js'
import { fieldsToView, collectFields } from './lib/field-view/index.js'
import { validatePayload } from './lib/validate/index.js'
import {
  addonByValue,
  getAddonData,
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from './lib/addons/index.js'
import {
  BASE,
  LAYOUT,
  breadcrumbs,
  hubPath,
  addonStepPath
} from './journey/index.js'

/**
 * "Add to your policy" — pick 0..N add-ons (checkboxes); each chosen add-on then
 * has its own short sub-journey of steps. In this task-list journey each add-on
 * is its own task that returns to the hub when finished. URL scheme:
 *   {base}/{id}/addons                    pick add-ons
 *   {base}/{id}/addons/{addon}/{step}     one step of a chosen add-on
 */

const ADDONS_SELECT_TEMPLATE = 'standalone/spike-c/templates/addons-select'
const ADDON_STEP_TEMPLATE = 'standalone/spike-c/templates/addon-step'

const addonsPathFor = (id, suffix) => `${BASE}/${id}/${suffix}`

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

function locateStep(params) {
  const addon = addonByValue.get(params.addon)
  if (!addon) {
    return null
  }
  const index = addon.steps.findIndex((step) => step.slug === params.step)
  return index === -1 ? null : { addon, step: addon.steps[index], index }
}

// Resolve the quote or short-circuit to the journey base; the inner handler
// only runs once a quote is present.
const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return h.redirect(BASE)
  }
  return handler(quote, request, h)
}

// Resolve the quote and the addressed add-on step, or short-circuit back to the
// selection page; the inner handler only runs once both are present.
const withStep = (handler) =>
  withQuote((quote, request, h) => {
    const found = locateStep(request.params)
    if (!found) {
      return h.redirect(addonsPathFor(quote.id, 'addons'))
    }
    return handler(quote, found, request, h)
  })

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

const getAddonsSelection = (quote, request, h) =>
  h.view(ADDONS_SELECT_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })

const postAddonsSelection = (quote, request, h) => {
  const raw = request.payload.addons
  const values = raw === undefined ? [] : [].concat(raw)
  const updated = setSelectedAddons(quote, values)
  return h.redirect(afterSelection(updated))
}

const getAddonStep = (quote, found, request, h) =>
  h.view(ADDON_STEP_TEMPLATE, stepViewModel(quote, found))

const renderStepErrors = (quote, found, payload, h, { errors, errorSummary }) =>
  h.view(
    ADDON_STEP_TEMPLATE,
    stepViewModel(quote, found, { errors, errorSummary, values: payload })
  )

const persistAndAdvance = (quote, found, value, h) => {
  const updated = saveAddonStep(
    quote,
    found.addon.value,
    collectFields(found.step.fields, value)
  )
  return h.redirect(afterStep(updated, found.addon.value, found.index))
}

const postAddonStep = (quote, found, request, h) => {
  const { value, errors, errorSummary } = validatePayload(
    found.step.schema,
    request.payload
  )
  return errors
    ? renderStepErrors(quote, found, request.payload, h, {
        errors,
        errorSummary
      })
    : persistAndAdvance(quote, found, value, h)
}

export function addonsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(getAddonsSelection)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(postAddonsSelection)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withStep(getAddonStep)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withStep(postAddonStep)
    }
  ]
}
