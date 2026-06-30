import { findQuote } from '../lib/store.js'
import { collectFields } from '../lib/fields/index.js'
import { validatePayload } from '../lib/validate/index.js'
import {
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from '../lib/addons/index.js'
import { BASE, LAYOUT, breadcrumbs } from '../journey.js'
import {
  at,
  selectionBack,
  afterSelection,
  afterStep,
  ADDON_STEP_VIEW,
  ADDONS_SELECT_VIEW
} from './navigation.js'
import { locateStep, stepViewModel } from './view-model.js'

// Resolve the quote once and short-circuit to BASE when it is missing.
const withQuote = (handler) => (request, responseToolkit) => {
  const quote = findQuote(request.params.id)
  if (!quote) {
    return responseToolkit.redirect(BASE)
  }
  return handler(quote, request, responseToolkit)
}

const persistAndAdvance = (quote, found, value) => {
  const updated = saveAddonStep(
    quote,
    found.addon.value,
    collectFields(found.step.fields, value)
  )
  return afterStep(updated, found.addon.value, found.index)
}

export const getAddonsSelect = withQuote((quote, request, responseToolkit) =>
  responseToolkit.view(ADDONS_SELECT_VIEW, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })
)

export const postAddonsSelect = withQuote((quote, request, responseToolkit) => {
  const raw = request.payload.addons
  const values = raw === undefined ? [] : [].concat(raw)
  const updated = setSelectedAddons(quote, values)
  return responseToolkit.redirect(afterSelection(updated))
})

export const getAddonStep = withQuote((quote, request, responseToolkit) => {
  const found = locateStep(request.params)
  if (!found) {
    return responseToolkit.redirect(at(quote.id, 'addons'))
  }
  return responseToolkit.view(ADDON_STEP_VIEW, stepViewModel(quote, found))
})

export const postAddonStep = withQuote((quote, request, responseToolkit) => {
  const found = locateStep(request.params)
  if (!found) {
    return responseToolkit.redirect(at(quote.id, 'addons'))
  }
  const { value, errors, errorSummary } = validatePayload(
    found.step.schema,
    request.payload
  )
  if (errors) {
    return responseToolkit.view(
      ADDON_STEP_VIEW,
      stepViewModel(quote, found, {
        errors,
        errorSummary,
        values: request.payload
      })
    )
  }
  return responseToolkit.redirect(persistAndAdvance(quote, found, value))
})
