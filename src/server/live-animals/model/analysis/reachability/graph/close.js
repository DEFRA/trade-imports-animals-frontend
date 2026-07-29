import { isSeedObligation } from './seed.js'

// Fixed-point iteration: an obligation becomes reachable once it's a seed
// or every non-self dep is already reachable. Iterate until no new nodes
// are marked; structurally-bad nodes are never marked reachable.
export const closeReachableSet = (records, structurallyBad) => {
  const reachable = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const rec of records) {
      if (reachable.has(rec.id)) continue
      if (structurallyBad.has(rec.id)) continue
      if (isSeedObligation(rec)) {
        reachable.add(rec.id)
        changed = true
        continue
      }
      const externalDeps = rec.dependsOn.filter((depId) => depId !== rec.id)
      if (externalDeps.every((depId) => reachable.has(depId))) {
        reachable.add(rec.id)
        changed = true
      }
    }
  }
  return reachable
}
