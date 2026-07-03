/**
 * Obligation type tags — pure string constants. The type is a structural
 * fact (what shape of value the obligation holds), NOT a widget choice:
 * the page picks the govuk component. `GROUP` is the one repeating
 * (indexed) collection shape; `QUOTE` is system-computed.
 */
export const T = Object.freeze({
  TEXT: 'text',
  EMAIL: 'email',
  TEL: 'tel',
  FORMATTED: 'formatted',
  SELECT: 'select',
  DATE: 'date',
  NUMBER: 'number',
  CURRENCY: 'currency',
  BOOLEAN: 'boolean',
  RADIO: 'radio',
  MULTISELECT: 'multiselect',
  TEXTAREA: 'textarea',
  FILE: 'file',
  QUOTE: 'quote',
  GROUP: 'group'
})
