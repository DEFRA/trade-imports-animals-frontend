import { schema, resolve } from './schema-document.js'
import { validateValue } from './validate-value.js'
import { activeBranches, ifProvenance } from './conditionals.js'
import { isEmpty } from '../lib/fieldutil.js'

/**
 * Partial validation distinguishing **missing** (not answered) from **invalid**
 * (answered wrongly) — the heart of "status from a whole-object schema".
 *
 * @param {object} answers - The current answers object.
 * @returns {{ missing: object[], invalid: object[] }} Missing entries carry the
 *   if/then `because` provenance; invalid entries carry the first error message.
 */
const baseMissing = (answers) =>
  schema.required
    .filter((key) => isEmpty(answers[key]))
    .map((key) => ({ path: key, because: [] }))

const baseInvalid = (answers) =>
  Object.entries(schema.properties)
    .filter(([key]) => !isEmpty(answers[key]))
    .map(([key, propertySchema]) => ({
      path: key,
      errors: validateValue(propertySchema, answers[key], key)
    }))
    .filter(({ errors }) => errors.length)
    .map(({ path, errors }) => ({ path, message: errors[0] }))

const branchMissing = (answers) =>
  activeBranches(answers).flatMap((branch) =>
    (branch.then.required ?? [])
      .filter((requiredKey) => isEmpty(answers[requiredKey]))
      .map((requiredKey) => ({
        path: requiredKey,
        because: ifProvenance(branch.if)
      }))
  )

const branchInvalid = (answers) =>
  activeBranches(answers).flatMap((branch) =>
    Object.entries(branch.then.properties ?? {})
      .filter(([key]) => !isEmpty(answers[key]))
      .map(([key, subSchema]) => ({
        path: key,
        errors: validateValue(
          { ...resolve(schema.properties[key]), ...subSchema },
          answers[key],
          key
        )
      }))
      .filter(({ errors }) => errors.length)
      .map(({ path, errors }) => ({ path, message: errors[0] }))
  )

export function check(answers) {
  return {
    missing: [...baseMissing(answers), ...branchMissing(answers)],
    invalid: [...baseInvalid(answers), ...branchInvalid(answers)]
  }
}
