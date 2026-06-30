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

const ADDONS_STEP = 'addons'
const ADDONS_SELECT_VIEW = 'standalone/spike-b/templates/addons-select'
const ADDON_STEP_VIEW = 'standalone/spike-b/templates/addon-step'

const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(request, responseToolkit, quote)
}

const withQuoteStep = (handler) =>
  withQuote((request, responseToolkit, quote) => {
    const found = locateStep(request.params)
    if (!found) {
      return responseToolkit.redirect(at(quote.id, ADDONS_STEP))
    }
    return handler(request, responseToolkit, quote, found)
  })

const toSelectedValues = (addonsPayload) =>
  addonsPayload === undefined ? [] : [].concat(addonsPayload)

const getAddonsSelect = (request, responseToolkit, quote) =>
  responseToolkit.view(ADDONS_SELECT_VIEW, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })

const postAddonsSelect = (request, responseToolkit, quote) => {
  const updated = setSelectedAddons(
    quote,
    toSelectedValues(request.payload.addons)
  )
  return responseToolkit.redirect(afterSelection(updated))
}

const getAddonStep = (request, responseToolkit, quote, found) =>
  responseToolkit.view(ADDON_STEP_VIEW, stepViewModel(quote, found))

const renderStepWithErrors = (
  responseToolkit,
  quote,
  found,
  payload,
  errors,
  errorSummary
) =>
  responseToolkit.view(
    ADDON_STEP_VIEW,
    stepViewModel(quote, found, { errors, errorSummary, values: payload })
  )

const saveStepAndRedirect = (responseToolkit, quote, found, value) => {
  const updated = saveAddonStep(
    quote,
    found.addon.value,
    collectFields(found.step.fields, value)
  )
  return responseToolkit.redirect(
    afterStep(updated, found.addon.value, found.index)
  )
}

const postAddonStep = (request, responseToolkit, quote, found) => {
  const { value, errors, errorSummary } = validatePayload(
    found.step.schema,
    request.payload
  )
  if (errors) {
    return renderStepWithErrors(
      responseToolkit,
      quote,
      found,
      request.payload,
      errors,
      errorSummary
    )
  }
  return saveStepAndRedirect(responseToolkit, quote, found, value)
}

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
      handler: withQuote(getAddonsSelect)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons`,
      options: open,
      handler: withQuote(postAddonsSelect)
    },
    {
      method: 'GET',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withQuoteStep(getAddonStep)
    },
    {
      method: 'POST',
      path: `${BASE}/{id}/addons/{addon}/{step}`,
      options: open,
      handler: withQuoteStep(postAddonStep)
    }
  ]
}
