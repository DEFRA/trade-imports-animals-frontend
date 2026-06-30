/**
 * Overlay validation errors onto a built field view. `errors` is the
 * `{ fieldName: 'message' }` map returned by `validatePayload`. For date inputs
 * the error keys are the per-part names (e.g. `dateOfBirth-day`); the first such
 * message is shown as the combined `errorMessage` and each erroring part gets
 * the GOV.UK `govuk-input--error` class.
 */

const ERROR_CLASS = 'govuk-input--error'
const DATE_PARTS = ['day', 'month', 'year']

const datePartKeys = (field) =>
  DATE_PARTS.map((part) => `${field.name}-${part}`)

const firstErrorMessage = (field, errors) =>
  datePartKeys(field)
    .map((key) => errors[key])
    .find((message) => message)

const withErrorClass = (item) => ({
  ...item,
  classes: `${item.classes ?? ''} ${ERROR_CLASS}`.trim()
})

const markErroringParts = (items, field, errors) =>
  items.map((item) =>
    errors[`${field.name}-${item.name}`] ? withErrorClass(item) : item
  )

const attachDateError = (view, field, errors) => {
  const firstMessage = firstErrorMessage(field, errors)
  if (!firstMessage) {
    return
  }
  view.args.errorMessage = { text: firstMessage }
  view.args.items = markErroringParts(view.args.items, field, errors)
}

const attachSimpleError = (view, field, errors) => {
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}

export function attachError(view, field, errors) {
  if (field.kind === 'date') {
    attachDateError(view, field, errors)
    return
  }
  attachSimpleError(view, field, errors)
}
