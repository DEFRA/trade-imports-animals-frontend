/**
 * Single-line govukInput view builders. Each takes a slot (one concrete
 * input: { inputName, label, hint?, value?, suggestions? }) and returns a
 * FieldViewItem `{ type, args }` for templates/partials/fields.njk to
 * dispatch on. NO builder ever emits `required` — every mandate is a
 * server-side round trip (the required-attribute ban, TOOL-13).
 */

const inputArgs = (slot, extra) => ({
  id: slot.inputName,
  name: slot.inputName,
  label: { text: slot.label },
  hint: slot.hint ? { text: slot.hint } : undefined,
  value: slot.value,
  ...extra
})

/** Plain text input; `suggestions` adds a native datalist (spike-a make). */
export const textView = (slot) =>
  slot.suggestions?.length
    ? {
        type: 'input',
        args: inputArgs(slot, {
          attributes: { list: `${slot.inputName}-suggestions` }
        }),
        suggestions: slot.suggestions
      }
    : { type: 'input', args: inputArgs(slot) }

export const emailView = (slot) => ({
  type: 'input',
  args: inputArgs(slot, { type: 'email', spellcheck: false })
})

export const telView = (slot) => ({
  type: 'input',
  args: inputArgs(slot, { type: 'tel', classes: 'govuk-input--width-20' })
})

export const numberView = (slot) => ({
  type: 'input',
  args: inputArgs(slot, {
    inputmode: 'numeric',
    classes: 'govuk-input--width-5'
  })
})

export const currencyView = (slot) => ({
  type: 'input',
  args: inputArgs(slot, {
    inputmode: 'numeric',
    prefix: { text: '£' },
    classes: 'govuk-input--width-5'
  })
})

/**
 * Formatted (pattern-constrained) input — postcode, registration. The
 * pattern is enforced server-side only (validation/format-checks.js);
 * no `pattern` attribute reaches the DOM.
 */
export const formattedView = (slot) => ({
  type: 'input',
  args: inputArgs(slot, { classes: 'govuk-input--width-10' })
})
