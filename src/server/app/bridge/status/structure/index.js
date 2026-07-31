import { groups, obligations } from '../../../model/obligations/manifest.js'
import { SYSTEM_POPULATED } from '../../obligation-source.js'

// --- structure: the manifest, projected into the status object shape ------
//
// The row/section STRUCTURE (which parts, facet membership, the collection
// floor, the any-of rule) is sourced from the obligations/groups exports and
// exposed under the object shape the classification below reads:
//   .id                → `name`
//   .collection        → obligation is a `within` group
//   .required          → `status: 'mandatory'`
//   .requiredAtLeastOne→ `requires.minEntries` OR `requires.anyOfIds`
//                        (the animalIdentifiers floor is a per-unit any-of)
//   .item              → obligations whose `within` is this group

const isGroup = (obligation) => groups().includes(obligation)

// Collection members for status = the group's `within` obligations MINUS the
// system-populated placeholders that no page collects — the same exclusion
// `flow/dispatch.js` applies when indexing pages to obligations.
const membersOf = (group) =>
  obligations().filter(
    (obligation) =>
      obligation.within === group && !SYSTEM_POPULATED.has(obligation.name)
  )

// Structural mandatory-when-in-scope fallback: a static `status:
// 'mandatory'`, or a conditional gate whose whenTrue branch is mandatory
// (commercial/privateTransporter, purposeInInternalMarket, cph,
// containsUnweanedAnimals). Top-level scalars are re-judged per state in
// `partRequired` via `effectiveStatus`.
const isMandatory = (obligation) =>
  obligation.status === 'mandatory' ||
  obligation.applyTo?.metadata?.whenTrue?.status === 'mandatory'

const toStructural = (obligation) => ({
  id: obligation.name,
  collection: isGroup(obligation),
  required: isMandatory(obligation),
  requiredAtLeastOne: Boolean(
    obligation.requires?.minEntries || obligation.requires?.anyOfIds
  ),
  item: isGroup(obligation)
    ? membersOf(obligation).map(toStructural)
    : undefined
})

export const structuralOf = (name) => {
  const obligation = obligations().find((candidate) => candidate.name === name)
  return obligation ? toStructural(obligation) : undefined
}
