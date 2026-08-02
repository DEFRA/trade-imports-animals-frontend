export const purposeOptions = Object.freeze([
  { value: 'INTERNAL_MARKET', text: 'Internal market' },
  { value: 'RE_ENTRY', text: 'Re-entry' },
  {
    value: 'RE_CONFORMITY_CHECK',
    text: 'For import re-conformity check'
  }
])

export const purposeLabel = (code) =>
  purposeOptions.find(({ value }) => value === code)?.text
