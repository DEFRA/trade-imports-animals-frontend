import { findQuote } from '../lib/store.js'
import { collectFields } from '../lib/fields/index.js'
import { validatePayload } from '../lib/validate/index.js'
import {
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from '../lib/addons/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'
import {
  at,
  selectionBack,
  afterSelection,
  afterStep,
  locateStep,
  stepViewModel
} from './step-view.js'

/**
 * "Add to your policy" — pick 0..N add-ons (checkboxes); each chosen add-on then
 * has its own short sub-journey of steps. In this task-list journey each add-on
 * is its own task that returns to the hub when finished. URL scheme:
 *   {base}/{id}/addons                    pick add-ons
 *   {base}/{id}/addons/{addon}/{step}     one step of a chosen add-on
 */
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
        return h.view('standalone/spike-b/templates/addons-select', {
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
          'standalone/spike-b/templates/addon-step',
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
            'standalone/spike-b/templates/addon-step',
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
