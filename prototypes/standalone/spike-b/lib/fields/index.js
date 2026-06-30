import { fieldToView, attachError } from './to-view.js'

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
export function fieldsToView(fields, data = {}, errors = null) {
  return fields.map((field) => {
    const view = fieldToView(field, data)
    if (errors) {
      attachError(view, field, errors)
    }
    return view
  })
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  const data = {}
  for (const field of fields) {
    if (field.kind === 'date') {
      data[field.name] = {
        day: payload[`${field.name}-day`],
        month: payload[`${field.name}-month`],
        year: payload[`${field.name}-year`]
      }
    } else if (field.kind === 'checkboxes') {
      const raw = payload[field.name]
      data[field.name] = raw === undefined ? [] : [].concat(raw)
    } else {
      data[field.name] = payload[field.name]
    }
  }
  return data
}
