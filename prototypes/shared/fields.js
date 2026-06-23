/**
 * A tiny field-spec engine. A field spec is plain data describing one GDS form
 * input; `fieldsToView` turns a list of specs + the current answers into ready
 * GOV.UK macro arguments, which shared/partials/fields.njk renders. This keeps
 * pages data-driven; the add-on subtask steps are built from field specs.
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

function fieldToView(field, data) {
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

export function fieldsToView(fields, data = {}) {
  return fields.map((field) => {
    const view = fieldToView(field, data)
    // Every GOV.UK input macro accepts errorMessage, so attach it uniformly.
    if (field.error) {
      view.args.errorMessage = { text: field.error }
    }
    return view
  })
}

/** Build a govukErrorSummary item list from any specs carrying an `error`. */
export function errorSummaryList(fields) {
  return fields
    .filter((field) => field.error)
    .map((field) => ({ text: field.error, href: `#${field.name}` }))
}

/** Read submitted values for a list of specs back into a quote patch. */
export function collectFields(fields, payload) {
  const data = {}
  for (const field of fields) {
    if (field.kind === 'date') {
      data[field.name] = {
        day: payload[`${field.name}-day`],
        month: payload[`${field.name}-month`],
        year: payload[`${field.name}-year`]
      }
    } else if (field.kind === 'checkboxes') {
      const raw = payload[field.name]
      data[field.name] = raw === undefined ? [] : [].concat(raw)
    } else {
      data[field.name] = payload[field.name]
    }
  }
  return data
}
