import { fieldToView, attachError } from './to-view/index.js'

/**
 * A tiny field-spec engine. A field spec is plain data describing one GDS form
 * input; `fieldsToView` turns a list of specs + the current answers into ready
 * GOV.UK macro arguments, which shared/partials/fields.njk renders. This keeps
 * pages data-driven; the add-on subtask steps are built from field specs.
 */

/**
 * Build view-ready GOV.UK macro args from a list of field specs + the current
 * answers + an optional error map.
 *
 * `errors` is the `{ fieldName: 'message' }` map returned by `validatePayload`.
 * For date inputs the error keys are the per-part names (e.g. `dateOfBirth-day`);
 * the first such message is shown as the combined `errorMessage` and each
 * erroring part gets the GOV.UK `govuk-input--error` class.
 */
export function fieldsToView(fields, answers = {}, errors = null) {
  return fields.map((field) => {
    const view = fieldToView(field, answers)
    if (errors) {
      attachError(view, field, errors)
    }
    return view
  })
}

const FIELD_KIND = { date: 'date', checkboxes: 'checkboxes' }
const DATE_PARTS = ['day', 'month', 'year']

const collectDateField = (field, payload) =>
  Object.fromEntries(
    DATE_PARTS.map((part) => [part, payload[`${field.name}-${part}`]])
  )

const collectCheckboxesField = (field, payload) =>
  payload[field.name] === undefined ? [] : [].concat(payload[field.name])

const collectField = (field, payload) => {
  if (field.kind === FIELD_KIND.date) {
    return collectDateField(field, payload)
  }
  if (field.kind === FIELD_KIND.checkboxes) {
    return collectCheckboxesField(field, payload)
  }
  return payload[field.name]
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  return Object.fromEntries(
    fields.map((field) => [field.name, collectField(field, payload)])
  )
}
