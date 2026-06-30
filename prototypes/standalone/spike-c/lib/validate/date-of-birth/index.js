/**
 * The date-of-birth schema family — a `${prefix}-day|-month|-year` triple in
 * either required (`dobSchema`) or optional (`required: false`) mode. Both share
 * the GDS calendar / 17-120 age rules. Public surface unchanged: the age
 * constants and the `dobSchema` factory.
 */

export { MAX_AGE, MIN_DRIVING_AGE } from './constants.js'
export { dobSchema } from './required-schema.js'
