import {
  textView,
  emailView,
  telView,
  numberView,
  currencyView,
  formattedView
} from './input-views.js'
import { textareaView, dateView, fileView } from './block-views.js'
import {
  radiosView,
  booleanView,
  checkboxesView,
  selectView
} from './choice-views.js'

/**
 * Obligation-type -> govuk-widget dispatch. The record's open `type` is
 * the SOLE discriminant (SHAPE-2) — unknown types fall back to a plain
 * text input, so a new catalogue type renders before it gets a bespoke
 * widget. No builder ever emits `required`; mandates are server-side
 * round trips only.
 */
const viewBuilders = {
  text: textView,
  email: emailView,
  tel: telView,
  number: numberView,
  currency: currencyView,
  formatted: formattedView,
  textarea: textareaView,
  date: dateView,
  file: fileView,
  radio: radiosView,
  boolean: booleanView,
  'multi-select': checkboxesView,
  select: selectView
}

export const slotToView = (slot) =>
  (viewBuilders[slot.type] ?? viewBuilders.text)(slot)
