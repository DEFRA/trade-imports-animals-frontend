/**
 * Convert domain-layer error records into the { errorList, fieldErrors }
 * shape the GOV.UK error summary + inline error macros consume.
 *
 * Domain errors look like:
 *   { code, obligation, path?, max?, min?, actual?, invalid?, options? }
 *
 * The rendered text is derived from a small per-code copy table; the
 * `href` is the fragment link into the field's rendered id
 * (`#<obligationName>` for singletons; `#<obligationName>-<path>` for
 * per-record fields).
 */

const COPY = {
  'domain.enum.notInOptions': ({ invalid, options }) =>
    `Select a value from the list${
      options && options.length ? ` (invalid: ${invalid?.join(', ')})` : ''
    }`,
  'domain.string.maxLength': ({ max, actual }) =>
    `Enter no more than ${max} characters (you entered ${actual})`,
  'domain.string.required': () => 'Enter a value',
  'domain.integer.min': ({ min }) =>
    `Enter a whole number of at least ${min ?? 1}`,
  'domain.integer.maxDigits': ({ maxDigits }) =>
    `Enter a whole number with no more than ${maxDigits} digits`,
  'domain.date.format': () => 'Enter a valid date in DD/MM/YYYY format',
  'domain.array.maxSelections': ({ max, actual }) =>
    `Select no more than ${max} items (you selected ${actual})`
}

export function textFor(error) {
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
