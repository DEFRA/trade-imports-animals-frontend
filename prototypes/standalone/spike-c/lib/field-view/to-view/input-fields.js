/**
 * The single-input family (text / email / tel / number / currency / postcode),
 * built from one shared `inputArgs` + a thin `inputView` factory. `labelArg` and
 * `hintArg` are the leaf helpers the rest of the builders share.
 */

export const hintArg = (field) =>
  field.hint ? { text: field.hint } : undefined
export const labelArg = (field) => ({ text: field.label })

const inputArgs = (field, value, overrides) => ({
  label: labelArg(field),
  id: field.name,
  name: field.name,
  hint: hintArg(field),
  value,
  ...overrides
})

const inputView = (overrides) => (field, value) => ({
  type: 'input',
  args: inputArgs(field, value, overrides)
})

export const textView = inputView()
export const emailView = inputView({ type: 'email', spellcheck: false })
export const telView = inputView({
  type: 'tel',
  classes: 'govuk-input--width-20'
})
export const numberView = inputView({
  inputmode: 'numeric',
  classes: 'govuk-input--width-5'
})
export const currencyView = inputView({
  inputmode: 'numeric',
  prefix: { text: '£' },
  classes: 'govuk-input--width-5'
})
export const postcodeView = inputView({ classes: 'govuk-input--width-10' })
