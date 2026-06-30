/**
 * Overlays validation error messages + error classes onto a built field view.
 * Date inputs surface the first erroring part as the combined message and tag
 * each erroring day/month/year box with `govuk-input--error`.
 */

const DATE_PARTS = ['day', 'month', 'year']

const itemWithError = (item, errors, namePrefix) =>
  errors[`${namePrefix}-${item.name}`]
    ? { ...item, classes: `${item.classes ?? ''} govuk-input--error`.trim() }
    : item

const attachDateError = (view, field, errors) => {
  const partKeys = DATE_PARTS.map((part) => `${field.name}-${part}`)
  const firstMessage = partKeys
    .map((key) => errors[key])
    .find((message) => message)
  if (firstMessage) {
    view.args.errorMessage = { text: firstMessage }
    view.args.items = view.args.items.map((item) =>
      itemWithError(item, errors, field.name)
    )
  }
}

export function attachError(view, field, errors) {
  if (field.kind === 'date') {
    attachDateError(view, field, errors)
    return
  }
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}
