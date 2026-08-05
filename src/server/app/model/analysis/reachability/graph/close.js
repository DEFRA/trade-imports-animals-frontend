import { isSeedObligation } from './seed.js'

// Fixed-point iteration: an obligation becomes reachable once it's a seed
// or every non-self dep is already reachable. Iterate until no new nodes
// are marked; structurally-bad nodes are never marked reachable.
const tryMarkReachable = (rec, reachable, structurallyBad) => {
  if (reachable.has(rec.id) || structurallyBad.has(rec.id)) {
    return false
  }
  const externalDeps = rec.dependsOn.filter((depId) => depId !== rec.id)
  if (
    isSeedObligation(rec) ||
    externalDeps.every((depId) => reachable.has(depId))
  ) {
    reachable.add(rec.id)
    return true
  }
  return false
}

export const closeReachableSet = (records, structurallyBad) => {
  const reachable = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const rec of records) {
      if (tryMarkReachable(rec, reachable, structurallyBad)) {
        changed = true
      }
    }
  }
  return reachable
}
