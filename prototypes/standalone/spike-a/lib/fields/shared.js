/** Shared GOV.UK macro-arg fragments used across the field view builders. */

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

export const labelAndHint = (field) => ({
  label: { text: field.label },
  hint: field.hint ? { text: field.hint } : undefined
})

export const legendAndHint = (field) => ({
  fieldset: {
    legend: { text: field.label, classes: 'govuk-fieldset__legend--m' }
  },
  hint: field.hint ? { text: field.hint } : undefined
})
