import { requiredDobSchema } from './required-schema.js'
import { optionalDobSchema } from './optional-schema.js'

/**
 * GDS-canonical DOB schema for a `${prefix}-day|-month|-year` triple. Dispatches
 * to the required-mode builder (default) or the optional-mode builder.
 *
 * Required mode: every part must be present; cross-field calendar / age rules
 * apply. Optional mode (`required: false`): a fully blank submission passes, but
 * any filled box makes all three required and re-applies the same rules. All
 * errors land on `${prefix}-day` so the summary links to the first box.
 *
 * @param {string} prefix the date input's namePrefix, e.g. 'dateOfBirth'
 * @param {string} label friendly label used in error messages, e.g. 'Date of birth'
 * @param {{ required?: boolean }} [options]
 */
export function dobSchema(prefix, label, { required = true } = {}) {
  return required
    ? requiredDobSchema(prefix, label)
    : optionalDobSchema(prefix, label)
}
