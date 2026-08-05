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
    for (const depId of rec.dependsOn) {
      if (depId === rec.id) {
        continue
      } // self-loop is not a dangling id
      if (!byId.has(depId)) {
        errors.push({
          obligationId: rec.id,
          reason: `dependsOn references unknown obligation id '${depId}'`
        })
        structurallyBad.add(rec.id)
        break // one error per obligation is enough
      }
    }
  }
  return { errors, structurallyBad }
}
