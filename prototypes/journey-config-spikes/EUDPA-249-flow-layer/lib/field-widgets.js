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

import { t, tOrNull } from './i18n.js'

/** UI-hint attributes for an address-block sub-field. Keeps the
 *  widget rule readable — every sub-field with a `type` in the
 *  domain rule map picks up the right HTML type + autocomplete +
 *  inputmode without inline branching. */
function uiHintsFor(sub, rule) {
  if (rule?.type === 'email') {
    return {
      type: 'email',
      autocomplete: 'email',
      spellcheck: false,
      classes: 'govuk-input--width-30'
    }
  }
  if (rule?.type === 'telephone') {
    return {
      type: 'tel',
      autocomplete: 'tel',
      classes: 'govuk-input--width-20'
    }
  }
  if (sub === 'postcode') {
    return {
      autocomplete: 'postal-code',
      classes: 'govuk-input--width-10'
    }
  }
  if (sub === 'addressLine1' || sub === 'addressLine2') {
    return {
      autocomplete: sub === 'addressLine1' ? 'address-line1' : 'address-line2'
    }
  }
  if (sub === 'town') return { autocomplete: 'address-level2' }
  if (sub === 'county') return { autocomplete: 'address-level1' }
  if (sub === 'name') return { autocomplete: 'organization' }
  return {}
}

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
            text: tOrNull(labels?.[v]) ?? v,
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
            text: tOrNull(labels?.[v]) ?? v,
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
              text: t('chrome.selectPlaceholder'),
              selected: value === undefined || value === ''
            },
            ...options.map((v) => ({
              value: v,
              text: tOrNull(labels?.[v]) ?? v,
              selected: value === v
            }))
          ],
          errorMessage: error ? { text: error } : undefined
        }
      }
    }
  },
  {
    id: 'address',
    build({ entry, id, value, legend, hint, fieldErrors }) {
      // Composite widget — renders one govukInput or govukSelect per
      // sub-field inside a fieldset legend. The stored value is a plain
      // object keyed by sub-field name. Sub-field errors surface via a
      // per-sub-field fieldErrors lookup keyed by `${id}__${subField}`.
      // Per-sub-field rules (from entry.subFieldRules, added in step 5e)
      // pick the underlying input type + wire up option lists for
      // enum sub-fields (country in the V4 standard block).
      //
      // Accessibility / GDS polish (2nd code review, findings #3 / #10 /
      // #11):
      //  - Legend carries `govuk-fieldset__legend--m` for consistency
      //    with singleton pages (#11).
      //  - Hint carries an id + fieldset gets `describedBy` so screen
      //    readers announce the hint alongside the legend (#3).
      //  - When ANY sub-field has an error, the whole widget wraps in
      //    a `.govuk-form-group--error` (#10) — the template consumes
      //    the `hasErrors` flag.
      if (entry?.type !== 'address') return null
      const subFields = entry.subFields ?? []
      const subFieldRules = entry.subFieldRules ?? {}
      const requiredSet = new Set(entry.required ?? [])
      const stored = value && typeof value === 'object' ? value : {}
      const hintId = hint ? `${id}-hint` : undefined
      const hasErrors = subFields.some(
        (sub) => fieldErrors?.[`${id}__${sub}`]?.text
      )
      return {
        type: 'address',
        args: {
          id,
          hasErrors,
          describedBy: hintId,
          legend: legend
            ? { text: legend, classes: 'govuk-fieldset__legend--m' }
            : undefined,
          hint: hint ? { id: hintId, text: hint } : undefined,
          subFields: subFields.map((sub) => {
            const subId = `${id}__${sub}`
            const subError = fieldErrors?.[subId]?.text
            const rule = subFieldRules[sub] ?? {}
            const optional = !requiredSet.has(sub)
            const label = {
              text:
                t(`presentation.address.subField.${sub}`) +
                (optional ? ' (optional)' : ''),
              classes: 'govuk-label--s'
            }
            const common = {
              id: subId,
              name: subId,
              label,
              value: stored[sub] ?? '',
              errorMessage: subError ? { text: subError } : undefined
            }
            if (rule.type === 'enum' && Array.isArray(rule.options)) {
              // Country and other MDM enum sub-fields render as a
              // govuk select with the placeholder + labelled options.
              return {
                ...common,
                widget: 'select',
                items: [
                  {
                    value: '',
                    text: t('chrome.selectPlaceholder'),
                    selected: !stored[sub]
                  },
                  ...rule.options.map((v) => ({
                    value: v,
                    text: tOrNull(rule.labels?.[v]) ?? v,
                    selected: stored[sub] === v
                  }))
                ]
              }
            }
            // String / telephone / email — plain govukInput with type,
            // inputmode, autocomplete, spellcheck adjusted per sub-
            // field so browser UX matches expectations.
            const uiHints = uiHintsFor(sub, rule)
            return {
              ...common,
              widget: 'input',
              ...uiHints
            }
          })
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
