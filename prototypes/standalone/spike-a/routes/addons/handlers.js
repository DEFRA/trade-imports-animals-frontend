import { collectFields } from '../../lib/fields/index.js'
import { validatePayload } from '../../lib/validate/index.js'
import {
  setSelectedAddons,
  saveAddonStep,
  selectionItems
} from '../../lib/addons/index.js'
import { LAYOUT, breadcrumbs } from '../../journey/config.js'
import {
  ADDONS_SELECT_TEMPLATE,
  ADDON_STEP_TEMPLATE,
  addonsPath,
  selectionBack,
  afterSelection,
  afterStep,
  locateStep
} from './helpers.js'
import { stepViewModel } from './view-model.js'

export const renderAddonsSelect = (quote, request, h) =>
  h.view(ADDONS_SELECT_TEMPLATE, {
    layout: LAYOUT,
    pageTitle: 'Add to your policy',
    items: selectionItems(quote),
    backLink: selectionBack(quote.id),
    breadcrumbs: breadcrumbs(quote, 'Add to your policy')
  })

export const submitAddonsSelect = (quote, request, h) => {
  const raw = request.payload.addons
  const values = raw === undefined ? [] : [].concat(raw)
  const updated = setSelectedAddons(quote, values)
  return h.redirect(afterSelection(updated))
}

export const renderAddonStep = (quote, request, h) => {
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

export const submitAddonStep = (quote, request, h) => {
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
