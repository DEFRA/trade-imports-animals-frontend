/**
 * Choice view builders: radios (per-option hints, spike-a cover-type
 * parity), the yes/no boolean pair (ONE visible 'Yes' label per group —
 * the conditional-reveal composition hangs a revealed child view off the
 * matching item via `reveal`, folded in by lib/fields/index.js), plus
 * checkboxes and select. Option labels come from the Flow slot (records
 * carry only values), shaped [{ value, label, hint? }].
 */

const BOOLEAN_YES = 'yes'
const BOOLEAN_NO = 'no'

const legendAndHint = (slot) => ({
  fieldset: {
    legend: { text: slot.label, classes: 'govuk-fieldset__legend--m' }
  },
  hint: slot.hint ? { text: slot.hint } : undefined
})

export const radiosView = (slot) => ({
  type: 'radios',
  args: {
    name: slot.inputName,
    ...legendAndHint(slot),
    items: (slot.options ?? []).map((option) => ({
      value: option.value,
      text: option.label,
      hint: option.hint ? { text: option.hint } : undefined,
      checked: slot.value === option.value
    }))
  }
})

/** Yes/no radios over the stored 'yes' | 'no' string (spike-a parity). */
export const booleanView = (slot) => ({
  type: 'radios',
  args: {
    name: slot.inputName,
    ...legendAndHint(slot),
    items: [
      { value: BOOLEAN_YES, text: 'Yes', checked: slot.value === BOOLEAN_YES },
      { value: BOOLEAN_NO, text: 'No', checked: slot.value === BOOLEAN_NO }
    ]
  }
})

export const checkboxesView = (slot) => {
  const values = [].concat(slot.value ?? [])
  return {
    type: 'checkboxes',
    args: {
      name: slot.inputName,
      ...legendAndHint(slot),
      items: (slot.options ?? []).map((option) => ({
        value: option.value,
        text: option.label,
        hint: option.hint ? { text: option.hint } : undefined,
        checked: values.includes(option.value)
      }))
    }
  }
}

export const selectView = (slot) => ({
  type: 'select',
  args: {
    id: slot.inputName,
    name: slot.inputName,
    label: { text: slot.label },
    hint: slot.hint ? { text: slot.hint } : undefined,
    items: [
      { value: '', text: slot.placeholder ?? 'Choose…' },
      ...(slot.options ?? []).map((option) => ({
        value: option.value,
        text: option.label,
        selected: slot.value === option.value
      }))
    ]
  }
})
