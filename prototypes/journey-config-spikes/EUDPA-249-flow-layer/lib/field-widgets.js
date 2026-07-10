/**
 * Field-widget dispatch — data-shaped, ordered rules. First match wins.
 * Each rule takes an obligation + its domain entry + the resolved
 * options list and decides which govuk-frontend widget to render.
 *
 * The output is a `FieldViewItem`:
 *
 *   { type: 'radios' | 'select' | 'checkboxes' | 'date' | 'input',
 *     args: <govuk macro arguments> }
 *
 * consumed only by templates/partials/fields.njk.
 *
 * `labels[value]` is a message key (see domain/index.js); resolve via
 * `t()` before rendering. Missing keys render as the raw dotted-path.
 */

import { t } from './i18n.js'

const OBLIGATION_MULTI = new Set([
  // Obligations whose stored value is an array — either enum-multi or a
  // stored set. Marks them for checkbox-widget dispatch.
  'transitedCountries',
  'species',
  'animalsCertifiedFor'
])

export const RADIO_MAX = 5

// A rule returns null when it does not match. The first non-null rule
// wins.
export const rules = [
  {
    id: 'checkboxes',
    build({
      obligation,
      entry,
      options,
      id,
      value,
      legend,
      hint,
      error,
      labels
    }) {
      if (entry?.type !== 'enum') return null
      if (!OBLIGATION_MULTI.has(obligation.name)) return null
      return {
        type: 'checkboxes',
        args: {
          name: id,
          fieldset: legend
            ? { legend: { text: legend, classes: 'govuk-fieldset__legend--m' } }
            : undefined,
          hint: hint ? { text: hint } : undefined,
          items: options.map((v) => ({
            value: v,
            text: t(labels?.[v]) ?? v,
            checked: Array.isArray(value) && value.includes(v)
          })),
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'radios',
    build({
      obligation,
      entry,
      options,
      id,
      value,
      legend,
      hint,
      error,
      labels
    }) {
      if (entry?.type !== 'enum') return null
      if (OBLIGATION_MULTI.has(obligation.name)) return null
      if (options.length > RADIO_MAX) return null
      return {
        type: 'radios',
        args: {
          idPrefix: id,
          name: id,
          fieldset: legend
            ? { legend: { text: legend, classes: 'govuk-fieldset__legend--m' } }
            : undefined,
          hint: hint ? { text: hint } : undefined,
          items: options.map((v) => ({
            value: v,
            text: t(labels?.[v]) ?? v,
            checked: value === v
          })),
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'select',
    build({
      obligation,
      entry,
      options,
      id,
      value,
      legend,
      hint,
      error,
      labels
    }) {
      if (entry?.type !== 'enum') return null
      if (OBLIGATION_MULTI.has(obligation.name)) return null
      if (options.length <= RADIO_MAX) return null
      return {
        type: 'select',
        args: {
          id,
          name: id,
          label: legend
            ? { text: legend, classes: 'govuk-label--m' }
            : undefined,
          hint: hint ? { text: hint } : undefined,
          items: [
            {
              value: '',
              text: '- Select -',
              selected: value === undefined || value === ''
            },
            ...options.map((v) => ({
              value: v,
              text: t(labels?.[v]) ?? v,
              selected: value === v
            }))
          ],
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'date',
    build({ entry, id, value, legend, hint, error }) {
      if (entry?.type !== 'date') return null
      // DD/MM/YYYY string is stored back as a single value; we render a
      // single text input labelled as such rather than the composite
      // date-input widget so the round-trip is trivial. If we later
      // move to a date-input widget, the existing predicate still
      // works — it parses DD/MM/YYYY.
      return {
        type: 'input',
        args: {
          id,
          name: id,
          label: legend
            ? { text: legend, classes: 'govuk-label--m' }
            : undefined,
          hint: hint ? { text: hint } : { text: 'DD/MM/YYYY.' },
          value: value ?? '',
          classes: 'govuk-input--width-10',
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'number',
    build({ entry, id, value, legend, hint, error }) {
      if (entry?.type !== 'integer') return null
      return {
        type: 'input',
        args: {
          id,
          name: id,
          label: legend
            ? { text: legend, classes: 'govuk-label--m' }
            : undefined,
          hint: hint ? { text: hint } : undefined,
          value: value === undefined || value === null ? '' : String(value),
          classes: 'govuk-input--width-10',
          inputmode: 'numeric',
          spellcheck: false,
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'text',
    build({ id, value, legend, hint, error }) {
      return {
        type: 'input',
        args: {
          id,
          name: id,
          label: legend
            ? { text: legend, classes: 'govuk-label--m' }
            : undefined,
          hint: hint ? { text: hint } : undefined,
          value: value ?? '',
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  }
]

export function pickWidget(ctx) {
  for (const rule of rules) {
    const view = rule.build(ctx)
    if (view) return { rule: rule.id, view }
  }
  return null
}
