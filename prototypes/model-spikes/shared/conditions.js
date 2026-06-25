/**
 * Declarative condition evaluation + provenance, shared by the spikes that use
 * condition objects (`{ field, eq }`, `{ all }`, `{ any }`). Because conditions
 * are data, the same object that gates applicability/guards also explains *why*
 * something is required.
 */

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
