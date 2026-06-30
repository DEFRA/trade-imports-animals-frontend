/**
 * Date-of-birth validation barrel — re-exports the same public names the
 * original single `date.js` had so import sites resolve identically.
 */

export { MAX_AGE, MIN_DRIVING_AGE } from './age.js'
export { dobSchema } from './dob-schema.js'
