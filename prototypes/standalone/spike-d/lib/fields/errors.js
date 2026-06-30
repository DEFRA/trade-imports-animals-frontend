// Attach validation error messages from `validatePayload` onto built views.

const attachDateError = (view, field, errors) => {
  const partKeys = [
    `${field.name}-day`,
    `${field.name}-month`,
    `${field.name}-year`
  ]
  const firstMessage = partKeys
    .map((key) => errors[key])
    .find((message) => message)
  if (!firstMessage) {
    return
  }
  view.args.errorMessage = { text: firstMessage }
  view.args.items = view.args.items.map((item) =>
    errors[`${field.name}-${item.name}`]
      ? { ...item, classes: `${item.classes ?? ''} govuk-input--error`.trim() }
      : item
  )
}

export const attachError = (view, field, errors) => {
  if (field.kind === 'date') {
    attachDateError(view, field, errors)
    return
  }
  const message = errors[field.name]
  if (message) {
    view.args.errorMessage = { text: message }
  }
}
