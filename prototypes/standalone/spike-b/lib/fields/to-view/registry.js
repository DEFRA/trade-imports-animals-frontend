import { inputView, textareaView, dateView } from './inputs.js'
import { radiosView, checkboxesView, selectView } from './choices.js'

/**
 * Field-spec → GOV.UK macro args. `fieldToView` maps one plain field spec + the
 * current answers into the macro arguments shared/partials/fields.njk renders.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

const fieldViewBuilders = {
  text: (field, value) => inputView(field, value),
  email: (field, value) =>
    inputView(field, value, { type: 'email', spellcheck: false }),
  tel: (field, value) =>
    inputView(field, value, { type: 'tel', classes: 'govuk-input--width-20' }),
  number: (field, value) =>
    inputView(field, value, {
      inputmode: 'numeric',
      classes: 'govuk-input--width-5'
    }),
  currency: (field, value) =>
    inputView(field, value, {
      inputmode: 'numeric',
      prefix: { text: '£' },
      classes: 'govuk-input--width-5'
    }),
  postcode: (field, value) =>
    inputView(field, value, { classes: 'govuk-input--width-10' }),
  textarea: textareaView,
  date: dateView,
  radios: radiosView,
  checkboxes: checkboxesView,
  select: selectView
}

export function fieldToView(field, data) {
  const value = data[field.name]
  const build = fieldViewBuilders[field.kind] ?? fieldViewBuilders.text
  return build(field, value)
}
