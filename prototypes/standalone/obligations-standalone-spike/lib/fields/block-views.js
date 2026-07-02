/**
 * Block-level view builders: textarea (character count when the catalogue
 * constrains maxLength), the three-part date input with unambiguous
 * Day/Month/Year labels, and the render-only file upload (spike-a parity:
 * the file is presented but never saved).
 */

const labelAndHint = (slot) => ({
  label: { text: slot.label },
  hint: slot.hint ? { text: slot.hint } : undefined
})

export const textareaView = (slot) =>
  slot.constraints?.maxLength
    ? {
        type: 'charactercount',
        args: {
          id: slot.inputName,
          name: slot.inputName,
          ...labelAndHint(slot),
          maxlength: slot.constraints.maxLength,
          value: slot.value
        }
      }
    : {
        type: 'textarea',
        args: {
          id: slot.inputName,
          name: slot.inputName,
          ...labelAndHint(slot),
          value: slot.value
        }
      }

export const dateView = (slot) => {
  const date = slot.value ?? {}
  return {
    type: 'date',
    args: {
      id: slot.inputName,
      namePrefix: slot.inputName,
      fieldset: { legend: { text: slot.label } },
      hint: slot.hint ? { text: slot.hint } : undefined,
      items: [
        {
          name: 'day',
          label: 'Day',
          classes: 'govuk-input--width-2',
          value: date.day
        },
        {
          name: 'month',
          label: 'Month',
          classes: 'govuk-input--width-2',
          value: date.month
        },
        {
          name: 'year',
          label: 'Year',
          classes: 'govuk-input--width-4',
          value: date.year
        }
      ]
    }
  }
}

export const fileView = (slot) => ({
  type: 'file',
  args: {
    id: slot.inputName,
    name: slot.inputName,
    ...labelAndHint(slot)
  }
})
