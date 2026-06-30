import { resolve } from './schema-document.js'
import { humanize, isEmpty } from '../lib/fieldutil.js'

const TYPE_STRING = 'string'
const TYPE_ARRAY = 'array'
const TYPE_OBJECT = 'object'

const enumErrors = (node, value, label) =>
  node.enum && !node.enum.includes(value)
    ? [`Select a valid ${humanize(label).toLowerCase()}`]
    : []

const stringErrors = (node, value, label) => {
  if (node.type !== TYPE_STRING) {
    return []
  }
  if (typeof value !== 'string') {
    return [`${humanize(label)} is not valid`]
  }
  const errors = []
  if (node.pattern && !new RegExp(node.pattern).test(value)) {
    errors.push(`Enter a valid ${humanize(label).toLowerCase()}`)
  }
  if (node.minLength !== undefined && value.length < node.minLength) {
    errors.push(`${humanize(label)} is required`)
  }
  return errors
}

const arrayErrors = (node, value, label) => {
  if (node.type !== TYPE_ARRAY) {
    return []
  }
  if (!Array.isArray(value)) {
    return [`${humanize(label)} is not valid`]
  }
  const errors = []
  if (node.minItems !== undefined && value.length < node.minItems) {
    errors.push(`${humanize(label)} needs at least ${node.minItems}`)
  }
  if (node.items) {
    errors.push(
      ...value.flatMap((element) => validateValue(node.items, element, label))
    )
  }
  return errors
}

const objectErrors = (node, value) => {
  if (node.type !== TYPE_OBJECT) {
    return []
  }
  const missingRequired = (node.required ?? [])
    .filter((requiredKey) => isEmpty(value?.[requiredKey]))
    .map((requiredKey) => `${humanize(requiredKey)} is required`)
  const childErrors = Object.entries(node.properties ?? {}).flatMap(
    ([key, childSchema]) =>
      value && !isEmpty(value[key])
        ? validateValue(childSchema, value[key], key)
        : []
  )
  return [...missingRequired, ...childErrors]
}

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
  return [
    ...enumErrors(node, value, label),
    ...stringErrors(node, value, label),
    ...arrayErrors(node, value, label),
    ...objectErrors(node, value)
  ]
}
