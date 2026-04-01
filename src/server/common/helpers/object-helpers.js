import _ from 'lodash'

/**
 * Normalise an unknown value into an object so callers can safely attach
 * additional fields without throwing (e.g. when the value is a string).
 *
 * If `value` is already an object (including arrays), it is returned as-is.
 * Otherwise it is wrapped as `{ [key]: value }`.
 *
 * @param {unknown} value
 * @param {string} key
 * @returns {object}
 */
export function toObject(value, key) {
  return _.isObject(value) && value !== null ? value : { [key]: value }
}

/**
 * Sum a list of values
 * @param arr
 * @returns {*}
 */

export function getTotal(arr) {
  return _(arr)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sum()
}
