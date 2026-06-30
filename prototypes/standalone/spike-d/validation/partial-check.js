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
export function check(answers) {
  const missing = []
  const invalid = []
  for (const key of schema.required) {
    if (isEmpty(answers[key])) {
      missing.push({ path: key, because: [] })
    }
  }
  for (const [key, node] of Object.entries(schema.properties)) {
    if (!isEmpty(answers[key])) {
      const errors = validateValue(node, answers[key], key)
      if (errors.length) {
        invalid.push({ path: key, message: errors[0] })
      }
    }
  }
  for (const branch of activeBranches(answers)) {
    for (const req of branch.then.required ?? []) {
      if (isEmpty(answers[req])) {
        missing.push({ path: req, because: ifProvenance(branch.if) })
      }
    }
    for (const [key, sub] of Object.entries(branch.then.properties ?? {})) {
      if (!isEmpty(answers[key])) {
        const merged = { ...resolve(schema.properties[key]), ...sub }
        const errors = validateValue(merged, answers[key], key)
        if (errors.length) {
          invalid.push({ path: key, message: errors[0] })
        }
      }
    }
  }
  return { missing, invalid }
}
