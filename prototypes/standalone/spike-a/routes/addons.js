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

const at = (id, suffix) => `${BASE}/${id}/${suffix}`

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

function stepViewModel(quote, found, extras = {}) {
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

export function addonsRoutes() {
  const open = { auth: false }
  return [
    {
      method: 'GET',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        return h.view('standalone/spike-a/templates/addons-select', {
          layout: LAYOUT,
          pageTitle: 'Add to your policy',
          items: selectionItems(quote),
          backLink: selectionBack(quote.id),
          breadcrumbs: breadcrumbs(quote, 'Add to your policy')
        })
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const raw = request.payload.addons
        const values = raw === undefined ? [] : [].concat(raw)
        const updated = setSelectedAddons(quote, values)
        return h.redirect(afterSelection(updated))
      }
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const found = locateStep(request.params)
        if (!found) {
          return h.redirect(at(quote.id, 'addons'))
        }
        return h.view(
          'standalone/spike-a/templates/addon-step',
          stepViewModel(quote, found)
        )
      }
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(BASE)
        }
        const found = locateStep(request.params)
        if (!found) {
          return h.redirect(at(quote.id, 'addons'))
        }
        const { value, errors, errorSummary } = validatePayload(
          found.step.schema,
          request.payload
        )
        if (errors) {
          return h.view(
            'standalone/spike-a/templates/addon-step',
            stepViewModel(quote, found, {
              errors,
              errorSummary,
              values: request.payload
            })
          )
        }
        const updated = saveAddonStep(
          quote,
          found.addon.value,
          collectFields(found.step.fields, value)
        )
        return h.redirect(afterStep(updated, found.addon.value, found.index))
      }
    }
  ]
}
