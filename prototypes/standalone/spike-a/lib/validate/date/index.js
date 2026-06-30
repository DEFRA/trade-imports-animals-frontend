import { requiredDobSchema } from './required-schema.js'
import { optionalDobSchema } from './optional-schema.js'

export { MAX_AGE, MIN_DRIVING_AGE } from './constants.js'

/**
 * Date-of-birth schema family. `dobSchema` is the factory used by sections.js /
 * addons.js so the DOB field's canonical rules are declared once and composed
 * with `Joi.object().concat(...)`. Required mode is the default; optional mode
 * (`required: false`) lets a fully blank submission pass.
 *
 * @param {string} prefix the date input's namePrefix, e.g. 'dateOfBirth'
 * @param {string} label friendly label used in error messages
 * @param {{ required?: boolean }} [options]
 */
export function dobSchema(prefix, label, { required = true } = {}) {
  return required
    ? requiredDobSchema(prefix, label)
    : optionalDobSchema(prefix, label)
}
