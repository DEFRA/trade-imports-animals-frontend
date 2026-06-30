// Shared leaf helpers for building GOV.UK macro args from a field spec.

export function inputArgs(field, value, extra) {
  return {
    label: { text: field.label },
    id: field.name,
    name: field.name,
    hint: field.hint ? { text: field.hint } : undefined,
    value,
    ...extra
  }
}

export const hintArg = (field) =>
  field.hint ? { text: field.hint } : undefined

export const legendArg = (field) => ({
  legend: { text: field.label, classes: 'govuk-fieldset__legend--m' }
})
