import { resolve } from './schema-document.js'
import { humanize, isEmpty } from '../lib/fieldutil.js'

/**
 * Validate one already-present value against a schema node. Supports the subset
 * the model uses: type/enum/pattern/minLength, array+items+minItems,
 * object+required, and `$ref`.
 *
 * @param {object} rawNode - The schema node (may be a `$ref` pointer).
 * @param {*} value - The already-present value to validate.
 * @param {string} [label] - Friendly field label used in error messages.
 * @returns {string[]} Validation messages — empty when the value is valid.
 */
export function validateValue(rawNode, value, label = 'value') {
  const node = resolve(rawNode)
  const errors = []
  if (node.enum && !node.enum.includes(value)) {
    errors.push(`Select a valid ${humanize(label).toLowerCase()}`)
  }
  if (node.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${humanize(label)} is not valid`)
    } else {
      if (node.pattern && !new RegExp(node.pattern).test(value)) {
        errors.push(`Enter a valid ${humanize(label).toLowerCase()}`)
      }
      if (node.minLength !== undefined && value.length < node.minLength) {
        errors.push(`${humanize(label)} is required`)
      }
    }
  }
  if (node.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${humanize(label)} is not valid`)
    } else {
      if (node.minItems !== undefined && value.length < node.minItems) {
        errors.push(`${humanize(label)} needs at least ${node.minItems}`)
      }
      if (node.items) {
        for (const item of value) {
          errors.push(...validateValue(node.items, item, label))
        }
      }
    }
  }
  if (node.type === 'object') {
    for (const req of node.required ?? []) {
      if (isEmpty(value?.[req])) {
        errors.push(`${humanize(req)} is required`)
      }
    }
    for (const [key, sub] of Object.entries(node.properties ?? {})) {
      if (value && !isEmpty(value[key])) {
        errors.push(...validateValue(sub, value[key], key))
      }
    }
  }
  return errors
}
