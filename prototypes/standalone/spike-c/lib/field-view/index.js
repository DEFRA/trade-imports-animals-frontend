import { fieldToView } from './to-view.js'
import { attachError } from './errors.js'

/**
 * A tiny field-spec engine. A field spec is plain data describing one GDS form
 * input; `fieldsToView` turns a list of specs + the current answers into ready
 * GOV.UK macro arguments, which partials/fields.njk renders. This keeps pages
 * data-driven; the add-on subtask steps are built from field specs.
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

export { collectFields } from './collect.js'
