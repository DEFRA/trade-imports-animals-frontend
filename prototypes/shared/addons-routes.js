import { findQuote } from './store.js'
import { fieldsToView, collectFields } from './fields.js'
import { validatePayload } from './validate.js'
import {
  addonByValue,
  getAddonData,
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from './addons.js'

/**
 * The "add to your policy" selection + per-add-on subtask pages as shared Hapi
 * routes. The variant supplies its base path, layout and navigation. URL scheme:
 *   {base}/{id}/addons                      pick add-ons (checkboxes)
 *   {base}/{id}/addons/{addon}/{step}       one step of a chosen add-on
 *
 * Navigation callbacks let each variant decide the flow: linear runs the whole
 * add-on sequence in order, while the task-list variants treat each add-on as
 * its own task returning to the hub.
 *
 * @param {object} config
 * @param {string} config.basePath
 * @param {string} config.layout
 * @param {(id: string) => string} config.selectionBack
 * @param {(quote: object) => string} config.afterSelection
 * @param {(quote: object, value: string, stepIndex: number) => string} config.stepBack
 * @param {(quote: object, value: string, stepIndex: number) => string} config.afterStep
 */
export function addonsRoutes(config) {
  const {
    basePath,
    layout,
    selectionBack,
    afterSelection,
    stepBack,
    afterStep,
    breadcrumbs
  } = config
  const open = { auth: false }
  const crumbs = (quote, title) =>
    breadcrumbs ? breadcrumbs(quote, title) : undefined

  const locateStep = (params) => {
    const addon = addonByValue.get(params.addon)
    if (!addon) {
      return null
    }
    const index = addon.steps.findIndex((step) => step.slug === params.step)
    return index === -1 ? null : { addon, step: addon.steps[index], index }
  }

  // Single view-model builder shared by GET and the POST re-render branch.
  // `extras` carries the validation outputs (errors/errorSummary/values) when
  // re-rendering after a failed submit; `values` (when present) overrides the
  // saved per-add-on data so the form shows what the user typed.
  function stepViewModel(quote, found, stepBack, crumbs, layout, extras = {}) {
    const data = extras.values
      ? coalesceStepValues(found.step.fields, extras.values)
      : getAddonData(quote, found.addon.value)
    return {
      layout,
      pageTitle: found.step.title,
      fields: fieldsToView(found.step.fields, data, extras.errors ?? null),
      backLink: stepBack(quote, found.addon.value, found.index),
      breadcrumbs: crumbs(quote, found.step.title),
      ...extras
    }
  }

  // Reshape the raw POST payload into the data structure addon partials
  // expect — date fields back into { day, month, year }, others passed through.
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

  return [
    {
      method: 'GET',
      path: `${basePath}/{id}/addons`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(basePath)
        }
        return h.view('shared/addons-select', {
          layout,
          pageTitle: 'Add to your policy',
          items: selectionItems(quote),
          backLink: selectionBack(quote.id),
          breadcrumbs: crumbs(quote, 'Add to your policy')
        })
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/addons`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(basePath)
        }
        const raw = request.payload.addons
        const values = raw === undefined ? [] : [].concat(raw)
        const updated = setSelectedAddons(quote, values)
        return h.redirect(afterSelection(updated))
      }
    },
    {
      method: 'GET',
      path: `${basePath}/{id}/addons/{addon}/{step}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(basePath)
        }
        const found = locateStep(request.params)
        if (!found) {
          return h.redirect(`${basePath}/${quote.id}/addons`)
        }
        return h.view(
          'shared/addon-step',
          stepViewModel(quote, found, stepBack, crumbs, layout)
        )
      }
    },
    {
      method: 'POST',
      path: `${basePath}/{id}/addons/{addon}/{step}`,
      options: open,
      handler(request, h) {
        const quote = findQuote(request.params.id)
        if (!quote) {
          return h.redirect(basePath)
        }
        const found = locateStep(request.params)
        if (!found) {
          return h.redirect(`${basePath}/${quote.id}/addons`)
        }
        const { value, errors, errorSummary } = validatePayload(
          found.step.schema,
          request.payload
        )
        if (errors) {
          return h.view(
            'shared/addon-step',
            stepViewModel(quote, found, stepBack, crumbs, layout, {
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
