import { fail } from '../fail.js'

export const validateValue = (value, location) => {
  if (value === undefined) {
    fail(`${location} value must be present`)
  }
}
