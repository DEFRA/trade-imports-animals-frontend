/**
 * Convert domain-layer error records into the { errorList, fieldErrors }
 * shape the GOV.UK error summary + inline error macros consume.
 *
 * Domain errors look like:
 *   { code, obligation, path?, max?, min?, actual?, invalid?, options? }
 *
 * The rendered text is derived from a small per-code dispatcher; the
 * `href` is the fragment link into the field's rendered id
 * (`#<obligationName>` for singletons; `#<obligationName>-<path>` for
 * per-record fields).
 *
 * Copy for every dispatcher lives in `locales/en.json` under
 * `errors.domain.*`; the dispatcher chooses a key + supplies params
 * (`{max}`, `{actual}` etc.) and `t()` handles interpolation. See
 * `FORMAT_ERROR_KEYS` for the list the coverage test walks.
 */

import { t } from './i18n.js'

const COPY = {
  'domain.enum.notInOptions': (error) => {
    // Two variants — one that includes the invalid selection(s) and a
    // plain fallback. Picked in JS because the two templates are
    // structurally different, not just parametrically.
    const key =
      error.options && error.options.length
        ? 'errors.domain.enumNotInOptions.withInvalid'
        : 'errors.domain.enumNotInOptions.plain'
    return t(key, { invalid: error.invalid?.join(', ') ?? '' })
  },
  'domain.string.maxLength': (error) =>
    t('errors.domain.stringMaxLength', {
      max: error.max,
      actual: error.actual
    }),
  'domain.string.required': () => t('errors.domain.stringRequired'),
  'domain.integer.min': (error) =>
    t('errors.domain.integerMin', { min: error.min ?? 1 }),
  'domain.integer.maxDigits': (error) =>
    t('errors.domain.integerMaxDigits', { maxDigits: error.maxDigits }),
  'domain.date.format': () => t('errors.domain.dateFormat'),
  'domain.array.maxSelections': (error) =>
    t('errors.domain.arrayMaxSelections', {
      max: error.max,
      actual: error.actual
    })
}

/**
 * List of every message key referenced from the COPY dispatchers.
 * Exported so `i18n-coverage.test.js` can walk it and assert each
 * key resolves in `locales/en.json` without having to run every
 * dispatcher.
 */
export const FORMAT_ERROR_KEYS = [
  'errors.domain.enumNotInOptions.plain',
  'errors.domain.enumNotInOptions.withInvalid',
  'errors.domain.stringMaxLength',
  'errors.domain.stringRequired',
  'errors.domain.integerMin',
  'errors.domain.integerMaxDigits',
  'errors.domain.dateFormat',
  'errors.domain.arrayMaxSelections'
]

export function textFor(error) {
  // Flow-level errors (e.g. code: 'flow.required') carry a pre-resolved
  // `message` string from the flow declaration — already looked up via
  // `t()` at the call site (see contract.js validatePagePayload).
  // Prefer it over the code-keyed COPY table so flow authors own
  // their wording without polluting the domain-error copy.
  if (error.message) return error.message
  const copy = COPY[error.code]
  return copy ? copy(error) : `Invalid: ${error.code}`
}

/**
 * hrefFor — computes the fragment link. If we're rendering a
 * per-record page, the field id includes the path so the fragment
 * navigates precisely to that record's input.
 */
export function hrefFor(error) {
  const anchor = error.path
    ? `${error.obligation}-${error.path}`
    : error.obligation
  return `#${anchor}`
}

/**
 * formatDomainErrors — takes an array of domain-error records, returns
 * `{ errorList, fieldErrors }`. Mirrors `formatValidationErrors` in
 * `src/server/common/helpers/validation-helpers.js` so the same GOV.UK
 * error-summary macro works unchanged.
 */
export function formatDomainErrors(errors) {
  const errorList = []
  const fieldErrors = {}
  for (const error of errors) {
    const text = textFor(error)
    const href = hrefFor(error)
    errorList.push({ text, href })
    const key = error.path
      ? `${error.obligation}-${error.path}`
      : error.obligation
    fieldErrors[key] = { text }
  }
  return { errorList, fieldErrors }
}
