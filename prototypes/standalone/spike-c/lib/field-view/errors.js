/**
 * Overlay validation errors onto a built field view. `errors` is the
 * `{ fieldName: 'message' }` map returned by `validatePayload`. For date inputs
 * the error keys are the per-part names (e.g. `dateOfBirth-day`); the first such
 * message is shown as the combined `errorMessage` and each erroring part gets
 * the GOV.UK `govuk-input--error` class.
 */
export function attachError(view, field, errors) {
  if (field.kind === 'date') {
    const partKeys = [
      `${field.name}-day`,
      `${field.name}-month`,
      `${field.name}-year`
    ]
    const firstMessage = partKeys
      .map((key) => errors[key])
      .find((message) => message)
    if (firstMessage) {
      view.args.errorMessage = { text: firstMessage }
      view.args.items = view.args.items.map((item) =>
        errors[`${field.name}-${item.name}`]
          ? {
              ...item,
              classes: `${item.classes ?? ''} govuk-input--error`.trim()
            }
          : item
      )
    }
    return
  }
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}
