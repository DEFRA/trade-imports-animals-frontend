/**
 * Attaches validation errors onto built field views. `errors` is the
 * `{ target: message }` map from validation/toFieldErrors — keyed by
 * inputName, or by `inputName-part` for date findings. Setting
 * `args.errorMessage` makes the govuk macro render the message, add the
 * error border class and wire `aria-describedby` to `#inputName-error`.
 */

const attachDateError = (view, slot, errors) => {
  const partKeys = ['day', 'month', 'year'].map(
    (part) => `${slot.inputName}-${part}`
  )
  const firstMessage = partKeys
    .map((key) => errors[key])
    .find((message) => message)
  if (!firstMessage) {
    return
  }
  view.args.errorMessage = { text: firstMessage }
  view.args.items = view.args.items.map((item) =>
    errors[`${slot.inputName}-${item.name}`]
      ? { ...item, classes: `${item.classes ?? ''} govuk-input--error`.trim() }
      : item
  )
}

export function attachError(view, slot, errors) {
  if (slot.type === 'date') {
    return attachDateError(view, slot, errors)
  }
  const message = errors[slot.inputName]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}
