/**
 * Declarative condition evaluation for Option A. Conditions are plain data
 * (`{ field, eq }`, `{ all: [...] }`, `{ any: [...] }`) so they double as
 * **provenance**: the same object that decides whether a step applies also
 * explains *why* it is required.
 */

/** Evaluate a condition object against the current answers. No condition = true. */
export function evalCondition(condition, answers) {
  if (!condition) {
    return true
  }
  if (condition.all) {
    return condition.all.every((sub) => evalCondition(sub, answers))
  }
  if (condition.any) {
    return condition.any.some((sub) => evalCondition(sub, answers))
  }
  if (condition.field !== undefined) {
    return answers[condition.field] === condition.eq
  }
  return true
}

/** Flatten a condition into the leaf `{ field, eq }` entries that justify it. */
export function provenance(condition) {
  if (!condition) {
    return []
  }
  if (condition.all) {
    return condition.all.flatMap(provenance)
  }
  if (condition.any) {
    return condition.any.flatMap(provenance)
  }
  if (condition.field !== undefined) {
    return [{ field: condition.field, eq: condition.eq }]
  }
  return []
}
