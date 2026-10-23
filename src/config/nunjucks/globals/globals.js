export const withReveals = (options, reveals) =>
  options.map(({ value, text, hint, checked }) => ({
    value,
    text,
    hint,
    checked,
    conditional: { html: reveals[value] }
  }))
