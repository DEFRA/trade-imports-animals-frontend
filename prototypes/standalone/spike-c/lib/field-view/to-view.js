/**
 * The per-kind spec->GOV.UK-macro switch. `fieldToView(field, data)` turns one
 * field spec plus the current answers into ready macro args for one input.
 *
 * Spec shape: { kind, name, label, hint?, options?, maxlength? }
 * kinds: text email tel number currency postcode textarea date radios
 *        checkboxes select
 */

function inputArgs(field, value, extra) {
  return {
    label: { text: field.label },
    id: field.name,
    name: field.name,
    hint: field.hint ? { text: field.hint } : undefined,
    value,
    ...extra
  }
}

export function fieldToView(field, data) {
  const value = data[field.name]

  switch (field.kind) {
    case 'text':
      return { type: 'input', args: inputArgs(field, value) }
    case 'email':
      return {
        type: 'input',
        args: inputArgs(field, value, { type: 'email', spellcheck: false })
      }
    case 'tel':
      return {
        type: 'input',
        args: inputArgs(field, value, {
          type: 'tel',
          classes: 'govuk-input--width-20'
        })
      }
    case 'number':
      return {
        type: 'input',
        args: inputArgs(field, value, {
          inputmode: 'numeric',
          classes: 'govuk-input--width-5'
        })
      }
    case 'currency':
      return {
        type: 'input',
        args: inputArgs(field, value, {
          inputmode: 'numeric',
          prefix: { text: '£' },
          classes: 'govuk-input--width-5'
        })
      }
    case 'postcode':
      return {
        type: 'input',
        args: inputArgs(field, value, { classes: 'govuk-input--width-10' })
      }
    case 'textarea':
      return field.maxlength
        ? {
            type: 'charactercount',
            args: {
              id: field.name,
              name: field.name,
              label: { text: field.label },
              hint: field.hint ? { text: field.hint } : undefined,
              maxlength: field.maxlength,
              value
            }
          }
        : {
            type: 'textarea',
            args: {
              id: field.name,
              name: field.name,
              label: { text: field.label },
              hint: field.hint ? { text: field.hint } : undefined,
              value
            }
          }
    case 'date': {
      const date = value ?? {}
      return {
        type: 'date',
        args: {
          id: field.name,
          namePrefix: field.name,
          fieldset: { legend: { text: field.label } },
          hint: field.hint ? { text: field.hint } : undefined,
          items: [
            { name: 'day', classes: 'govuk-input--width-2', value: date.day },
            {
              name: 'month',
              classes: 'govuk-input--width-2',
              value: date.month
            },
            { name: 'year', classes: 'govuk-input--width-4', value: date.year }
          ]
        }
      }
    }
    case 'radios':
      return {
        type: 'radios',
        args: {
          name: field.name,
          fieldset: {
            legend: {
              text: field.label,
              classes: 'govuk-fieldset__legend--m'
            }
          },
          hint: field.hint ? { text: field.hint } : undefined,
          items: field.options.map((option) => ({
            value: option.value,
            text: option.text,
            checked: value === option.value
          }))
        }
      }
    case 'checkboxes':
      return {
        type: 'checkboxes',
        args: {
          name: field.name,
          fieldset: {
            legend: {
              text: field.label,
              classes: 'govuk-fieldset__legend--m'
            }
          },
          hint: field.hint ? { text: field.hint } : undefined,
          items: field.options.map((option) => ({
            value: option.value,
            text: option.text,
            checked: (value ?? []).includes(option.value)
          }))
        }
      }
    case 'select':
      return {
        type: 'select',
        args: {
          id: field.name,
          name: field.name,
          label: { text: field.label },
          hint: field.hint ? { text: field.hint } : undefined,
          items: [
            { value: '', text: 'Choose…' },
            ...field.options.map((option) => ({
              value: option.value,
              text: option.text,
              selected: value === option.value
            }))
          ]
        }
      }
    default:
      return { type: 'input', args: inputArgs(field, value) }
  }
}
