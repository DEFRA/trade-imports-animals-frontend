export const withReveals = (options, reveals) =>
  options.map(({ value, text, hint, checked }) => ({
    value,
    text,
    hint,
    checked,
    conditional: { html: reveals[value] }
  }))

export const withAttributes = (button, attributes) => ({
  ...button,
  attributes: { ...button.attributes, ...attributes }
})
