import {
  textView,
  emailView,
  telView,
  numberView,
  currencyView,
  postcodeView
} from './input-fields.js'
import { textareaToView, dateToView } from './text-and-date.js'
import {
  radiosToView,
  checkboxesToView,
  selectToView
} from './option-fields.js'

/**
 * The per-kind spec->GOV.UK-macro builders. `fieldToView(field, answers)` turns
 * one field spec plus the current answers into ready macro args for one input.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

const VIEW_BUILDERS = {
  text: textView,
  email: emailView,
  tel: telView,
  number: numberView,
  currency: currencyView,
  postcode: postcodeView,
  textarea: textareaToView,
  date: dateToView,
  radios: radiosToView,
  checkboxes: checkboxesToView,
  select: selectToView
}

export function fieldToView(field, answers) {
  const value = answers[field.name]
  const builder = VIEW_BUILDERS[field.kind] ?? textView
  return builder(field, value)
}
