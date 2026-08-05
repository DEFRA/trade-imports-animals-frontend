// Dangling ids and missing dependsOn arrays. Anomalous obligations are
// excluded from the reachable/unreachable classification and reported only
// in errors.
export const findStructuralDefects = (records, byId) => {
  const errors = []
  const structurallyBad = new Set()
  for (const rec of records) {
    if (!Array.isArray(rec.dependsOn)) {
      errors.push({
        obligationId: rec.id,
        reason:
          'missing dependsOn array (the manifest coverage assertion should have caught this)'
      })
      structurallyBad.add(rec.id)
      continue
    }
    const danglingDepId = rec.dependsOn.find(
      (depId) => depId !== rec.id && !byId.has(depId)
    )
    if (danglingDepId !== undefined) {
      errors.push({
        obligationId: rec.id,
        reason: `dependsOn references unknown obligation id '${danglingDepId}'`
      })
      structurallyBad.add(rec.id)
    }
  }
  return { errors, structurallyBad }
}
