// An obligation is a seed if it has an empty dependsOn (always in scope) or
// its dependsOn is a pure self-loop `[own-id]` — no external prerequisite.
export const isSeedObligation = (rec) =>
  rec.dependsOn.length === 0 || rec.dependsOn.every((depId) => depId === rec.id)
