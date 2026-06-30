import { findQuote } from '../lib/store.js'
import { collectFields } from '../lib/field-view/index.js'
import { validatePayload } from '../lib/validate/index.js'
import {
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from '../lib/addons/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey/index.js'
import {
  addonsPathFor,
  selectionBack,
  afterSelection,
  afterStep,
  locateStep
} from './navigation.js'
import { stepViewModel } from './view-model.js'

const ADDONS_SELECT_TEMPLATE = 'standalone/spike-c/templates/addons-select'
const ADDON_STEP_TEMPLATE = 'standalone/spike-c/templates/addon-step'

// Resolve the quote or short-circuit to the journey base; the inner handler
// only runs once a quote is present.
export const withQuote = (handler) => (request, h) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return h.redirect(BASE)
  }
  return handler(quote, request, h)
}

// Resolve the quote and the addressed add-on step, or short-circuit back to the
// selection page; the inner handler only runs once both are present.
export const withStep = (handler) =>
  withQuote((quote, request, h) => {
    const found = locateStep(request.params)
    if (!found) {
      return h.redirect(addonsPathFor(quote.id, 'addons'))
    }
    return handler(quote, found, request, h)
  })

export const getAddonsSelection = (quote, request, h) =>
  h.view(ADDONS_SELECT_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })

export const postAddonsSelection = (quote, request, h) => {
  const raw = request.payload.addons
  const values = raw === undefined ? [] : [].concat(raw)
  const updated = setSelectedAddons(quote, values)
  return h.redirect(afterSelection(updated))
}

export const getAddonStep = (quote, found, request, h) =>
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

export const postAddonStep = (quote, found, request, h) => {
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
