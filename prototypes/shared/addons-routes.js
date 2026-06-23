import { findQuote } from './store.js'
import { fieldsToView, collectFields } from './fields.js'
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
    afterStep
  } = config
  const open = { auth: false }

  const locateStep = (params) => {
    const addon = addonByValue.get(params.addon)
    if (!addon) {
      return null
    }
    const index = addon.steps.findIndex((step) => step.slug === params.step)
    return index === -1 ? null : { addon, step: addon.steps[index], index }
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
          backLink: selectionBack(quote.id)
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
        return h.view('shared/addon-step', {
          layout,
          pageTitle: found.step.title,
          fields: fieldsToView(
            found.step.fields,
            getAddonData(quote, found.addon.value)
          ),
          backLink: stepBack(quote, found.addon.value, found.index)
        })
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
        const updated = saveAddonStep(
          quote,
          found.addon.value,
          collectFields(found.step.fields, request.payload)
        )
        return h.redirect(afterStep(updated, found.addon.value, found.index))
      }
    }
  ]
}
