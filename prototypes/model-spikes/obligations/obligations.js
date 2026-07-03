/**
 * Obligations — the single source of truth for the Service.
 *
 * Each obligation is declared as its own named const, carrying identifiers
 * (id, name), data-contract fields (cardinality, indexedBy, group), and the
 * applicability function (`applyTo`) together. Cross-obligation references
 * inside an `applyTo` are direct symbol lookups — e.g.
 * `fulfilments[hasVoluntaryExcess.id]` — so ESLint can catch orphan
 * declarations that the previous name-keyed dynamic dispatch would have
 * silently allowed.
 *
 * Per §Conditional obligation patterns in
 * prototypes/model-spikes/obligations.md, `applyTo(fulfilments)` returns
 * the obligation's **implication** for the current fulfilments —
 * `{ inScope, status?, reasons?, fulfilments? }`. The two patterns
 * (mandatoryWhen / appliesWhen) are enacted by the return-shape choice, not
 * by any field on the record.
 *
 * The `obligations` array at the bottom is the manifest — reordering it
 * does not move the definitions above.
 *
 * Obligation groups (see §Obligation groups) tie atomic obligations
 * together as a compound-record concept — e.g. `claimType` + `claimAmount`
 * as members of the `claim` group. Members are ordinary atomic
 * obligations (one per form field, per HTML-alignment convention); the
 * group is metadata declaring which obligations describe the same
 * real-world event and share a fulfilmentId space.
 *
 * A generator over this array can emit a data-only "data dictionary" JSON
 * for portability / documentation / cross-language consumers — see §Stretch
 * goals → Data-dictionary generation.
 */

export const fullName = {
  id: 'e5a1c4d8-3f9b-4e2a-9d7c-1f6b8e0a2c4d',
  name: 'fullName',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Always-optional: preferredName is always shown to the user but never
// required. Matches the prototype's about-you page: "What should we call
// you? (Optional. We'll use this when we contact you.)". No reason emitted
// — reasons are for provenance of state changes; this obligation has no
// state changes to explain.
export const preferredName = {
  id: '4d7c1f6b-8e0a-2c4d-9d7c-1f6b8e0a2c4d',
  name: 'preferredName',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'optional' })
}

export const dateOfBirth = {
  id: 'b7d3e5f1-9a2c-4b8d-8e0f-3c5a7b9d1e2f',
  name: 'dateOfBirth',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const hasVoluntaryExcess = {
  id: '3a5c7e9b-1d4f-4a6c-8e0f-2b4c6d8e0f2a',
  name: 'hasVoluntaryExcess',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen: excessAmount only applies (in-scope) when the user has
// opted for voluntary excess. Scope-exit purges any stored value.
export const excessAmount = {
  id: 'f1e2d3c4-b5a6-4978-8697-1a2b3c4d5e6f',
  name: 'excessAmount',
  cardinality: 'single',
  applyTo: (fulfilments) => {
    if (fulfilments[hasVoluntaryExcess.id] === true) {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.excessAmount.applicable.becauseVoluntaryExcess',
            explanation: 'excessAmount applies when hasVoluntaryExcess is true'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

export const hasNamedDriver = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  name: 'hasNamedDriver',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen: namedDriverName only applies when the user has a named
// driver. Scope-exit purges any stored value.
export const namedDriverName = {
  id: 'd1e2f345-6789-4abc-8def-012345678901',
  name: 'namedDriverName',
  cardinality: 'single',
  applyTo: (fulfilments) => {
    if (fulfilments[hasNamedDriver.id] === true) {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.namedDriverName.applicable.becauseNamedDriver',
            explanation: 'namedDriverName applies when hasNamedDriver is true'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

// Optional-when-applicable: namedDriverRelationship only applies when the
// user has a named driver (same gate as namedDriverName). When applicable,
// it's OPTIONAL rather than mandatory — knowing the relationship is
// helpful context but not required. Scope-exit purges any stored value
// when hasNamedDriver flips false.
export const namedDriverRelationship = {
  id: '8e0f1a2b-3c4d-4e5f-6a7b-8c9d0e1f2a3b',
  name: 'namedDriverRelationship',
  cardinality: 'single',
  applyTo: (fulfilments) => {
    if (fulfilments[hasNamedDriver.id] === true) {
      return {
        inScope: true,
        status: 'optional',
        reasons: [
          {
            code: 'obligation.namedDriverRelationship.applicable.becauseNamedDriver',
            explanation:
              'namedDriverRelationship applies when hasNamedDriver is true'
          }
        ]
      }
    }
    return { inScope: false }
  }
}

export const licenseType = {
  id: '9f8e7d6c-5b4a-4392-8175-6c5b4a392817',
  name: 'licenseType',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// mandatoryWhen: licenseCountryIssued is always in-scope (meaningful for
// anyone — defaults to UK for standard licenses) but only required when
// the license type is 'other'. Value retained across condition changes;
// no purge.
export const licenseCountryIssued = {
  id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
  name: 'licenseCountryIssued',
  cardinality: 'single',
  applyTo: (fulfilments) => {
    if (fulfilments[licenseType.id] === 'other') {
      return {
        inScope: true,
        status: 'mandatory',
        reasons: [
          {
            code: 'obligation.licenseCountryIssued.mandatory.becauseLicenseTypeOther',
            explanation:
              'licenseCountryIssued is mandatory when licenseType is other'
          }
        ]
      }
    }
    return { inScope: true, status: 'optional' }
  }
}

// Gate for the modifications sub-journey — matches the prototype's
// "declare vehicle modifications" opt-in. The user answers yes/no; if
// yes, they enter the modifications flow (multi-select + per-mod cost).
export const hasModifications = {
  id: '1a2b3c4d-5e6f-4708-8091-2a3b4c5d6e7f',
  name: 'hasModifications',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen: modifications multi-select is only in-scope when the user
// has said they have modifications. Value is an array of strings — e.g.
// ['turbo', 'alloys']. Scope-exit purges the array.
export const modifications = {
  id: '2b3c4d5e-6f78-4a9b-8c0d-1e2f3a4b5c6d',
  name: 'modifications',
  cardinality: 'single',
  applyTo: (fulfilments) => {
    if (fulfilments[hasModifications.id] !== true) {
      return { inScope: false }
    }
    return {
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.modifications.applicable.becauseHasModifications',
          explanation: 'modifications applies when hasModifications is true'
        }
      ]
    }
  }
}

// Derived indexed: modificationCost is derived from the modifications
// multi-select. Each selected modification value becomes a fulfilmentId
// under this obligation; the user then fills in the cost per modification.
//
// Also gated on hasModifications — if the user hasn't opted in, the
// derived collection is out-of-scope entirely (not just empty). Otherwise
// modificationCost could see a stale controller value that hasn't yet
// been purged in the current pass. Gating both obligations independently
// mirrors iteration 4b's claimType / claimAmount pattern.
//
// Lifecycle (per §Lifecycle for derived):
//   - controller adds a value → fresh blank cost fulfilment for that key
//   - controller removes a value → cost fulfilment for that key is purged
//     (via the evaluator's per-fulfilmentId purge — see evaluator.js)
//   - controller re-adds a value → fresh blank (no rehydration; the
//     evaluator has no memory of the prior value)
//
// Mutability is `edit-only` — the user edits cost values within the
// fixed collection shape; add/remove happens via the controller.
export const modificationCost = {
  id: '3c4d5e6f-7890-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'modificationCost',
  cardinality: 'indexed',
  indexedBy: {
    source: 'derived',
    controllingObligation: 'modifications',
    mutability: 'edit-only'
  },
  applyTo: (fulfilments) => {
    if (fulfilments[hasModifications.id] !== true) {
      return { inScope: false }
    }
    const selectedModificationIds = fulfilments[modifications.id] ?? []
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.modificationCost.applicable.becauseHasModifications',
          explanation: 'modificationCost applies when hasModifications is true'
        }
      ],
      fulfilments: selectedModificationIds.map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    }
  }
}

export const hasClaims = {
  id: 'b2a1c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e',
  name: 'hasClaims',
  cardinality: 'single',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen + indexed: claimType belongs to the `claim` group (see below).
// Only in-scope when the user has said they've had claims. Each fulfilmentId
// represents one claim event; the value under it is the claim's type
// ('accident' | 'theft' | 'windscreen' | 'other'). The same fulfilmentId
// appears under `claimAmount` — the two members share the group's
// fulfilmentId space by convention (orchestrator-enforced in a real
// service; test fixtures enforce it here).
export const claimType = {
  id: 'e8f7d6c5-b4a3-4291-8074-6c5b4a392817',
  name: 'claimType',
  group: 'claim',
  cardinality: 'indexed',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' },
  applyTo: (fulfilments) => {
    if (fulfilments[hasClaims.id] !== true) {
      return { inScope: false }
    }
    const collection = fulfilments[claimType.id] ?? {}
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.claimType.applicable.becauseHasClaims',
          explanation: 'claimType applies when hasClaims is true'
        }
      ],
      fulfilments: Object.keys(collection).map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    }
  }
}

// appliesWhen + indexed: claimAmount belongs to the `claim` group. Same
// applicability gate as claimType; shares fulfilmentIds with claimType so
// each pair (type, amount) describes one claim event.
export const claimAmount = {
  id: 'a9b8c7d6-e5f4-4312-8091-6c5b4a392817',
  name: 'claimAmount',
  group: 'claim',
  cardinality: 'indexed',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' },
  applyTo: (fulfilments) => {
    if (fulfilments[hasClaims.id] !== true) {
      return { inScope: false }
    }
    const collection = fulfilments[claimAmount.id] ?? {}
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.claimAmount.applicable.becauseHasClaims',
          explanation: 'claimAmount applies when hasClaims is true'
        }
      ],
      fulfilments: Object.keys(collection).map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    }
  }
}

/**
 * Obligation groups.
 *
 * A group is a declarative tie between atomic obligations that together
 * describe one compound record — e.g. a `claim` event has a type and an
 * amount. Members are ordinary atomic obligations (one per form field, so
 * HTML alignment tests still map 1:1). Under an indexed group, members
 * share the group's fulfilmentId space by convention.
 *
 * For iteration 4 the group is metadata only — the evaluator processes
 * members as ordinary indexed obligations and doesn't do anything special
 * with the group record. Future iterations can add group-level scope
 * inheritance (member scope = group scope) and group-level completeness
 * ("this claim is complete if all members have a fulfilment for its id").
 *
 * See §Obligation groups in obligations.md.
 */
export const claimGroup = {
  id: 'f5e4d3c2-b1a0-4987-8654-3210fedcba98',
  name: 'claim',
  cardinality: 'indexed',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' },
  members: [claimType, claimAmount]
}

// -------------------------------------------------------------------------
// Nested indexing exemplar: named drivers, each with a full name and an
// indexed collection of addresses.
//
// Structure (see §S. Nested indexing in obligations.md):
//   - driver — outer collection (indexed, user-driven). Each fulfilment is
//     one driver; the value under the driver's id is a presence marker
//     (empty object).
//   - driverFullName — one string per driver. Derived from driver:
//     fulfilmentIds are the driver ids.
//   - driverAddress — nested indexed. Outer keyed by driver fulfilmentId
//     (derived from driver); inner keyed by opaque address fulfilmentId
//     (user-driven at the inner level).
//   - driverGroup — metadata declaring the members (mirrors claimGroup).
//
// This iteration doesn't enforce 5-year address-coverage; that's a
// cross-fulfilment quantifier rule captured as a follow-up. Address values
// are opaque to the evaluator; tests use realistic shapes like
// { line1, town, postcode, country, from, to } but the model doesn't
// interpret them.
// -------------------------------------------------------------------------
export const driver = {
  id: '5a6b7c8d-9e0f-4123-8456-789abcdef012',
  name: 'driver',
  cardinality: 'indexed',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' },
  applyTo: (fulfilments) => {
    const collection = fulfilments[driver.id] ?? {}
    return {
      inScope: true,
      fulfilments: Object.keys(collection).map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    }
  }
}

// Derived from driver: one full-name entry per driver. FulfilmentIds are
// the driver ids themselves.
export const driverFullName = {
  id: '6b7c8d9e-0f12-4234-8567-89abcdef0123',
  name: 'driverFullName',
  group: 'driver',
  cardinality: 'indexed',
  indexedBy: {
    source: 'derived',
    controllingObligation: 'driver',
    mutability: 'edit-only'
  },
  applyTo: (fulfilments) => {
    const driverIds = Object.keys(fulfilments[driver.id] ?? {})
    return {
      inScope: true,
      fulfilments: driverIds.map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    }
  }
}

// Nested indexed (depth 1): outer keyed by driver id (derived from
// driver); inner keyed by opaque address id (user-driven at the inner
// level). Each entry in the implication's `fulfilments` carries
// `subFulfilments` listing that driver's addresses.
//
// `indexedBy.nested` is a **levels array** — one entry per level below
// the outer. Length = depth below outer. See §S in obligations.md.
export const driverAddress = {
  id: '7c8d9e0f-1234-4345-8678-9abcdef01234',
  name: 'driverAddress',
  group: 'driver',
  cardinality: 'indexed',
  indexedBy: {
    source: 'derived',
    controllingObligation: 'driver',
    mutability: 'edit-only', // outer: bound to driver membership
    nested: [
      // inner level: user adds/removes addresses freely
      { source: 'user', mutability: 'edit-add-remove' }
    ]
  },
  applyTo: (fulfilments) => {
    const driverIds = Object.keys(fulfilments[driver.id] ?? {})
    const stored = fulfilments[driverAddress.id] ?? {}
    return {
      inScope: true,
      fulfilments: driverIds.map((driverFulfilmentId) => {
        const perDriver = stored[driverFulfilmentId] ?? {}
        return {
          fulfilmentId: driverFulfilmentId,
          subFulfilments: Object.keys(perDriver).map((addressId) => ({
            fulfilmentId: addressId,
            status: 'mandatory'
          }))
        }
      })
    }
  }
}

// Nested indexed (depth 1): one indexed collection of claims per driver.
// Parallels driverAddress. Outer keyed by driver id (derived from
// driver); inner keyed by opaque claim id (user-driven at the inner
// level). Presence-marker values under each claim id — this iteration
// doesn't model per-claim fields (type / amount / date). Those would be
// separate obligations sharing the (driver, claim) fulfilmentId space.
export const driverClaim = {
  id: '9e0f1234-5678-4567-89ab-cdef01234567',
  name: 'driverClaim',
  group: 'driver',
  cardinality: 'indexed',
  indexedBy: {
    source: 'derived',
    controllingObligation: 'driver',
    mutability: 'edit-only',
    nested: [{ source: 'user', mutability: 'edit-add-remove' }]
  },
  applyTo: (fulfilments) => {
    const driverIds = Object.keys(fulfilments[driver.id] ?? {})
    const stored = fulfilments[driverClaim.id] ?? {}
    return {
      inScope: true,
      fulfilments: driverIds.map((driverFulfilmentId) => {
        const perDriver = stored[driverFulfilmentId] ?? {}
        return {
          fulfilmentId: driverFulfilmentId,
          subFulfilments: Object.keys(perDriver).map((claimId) => ({
            fulfilmentId: claimId,
            status: 'mandatory'
          }))
        }
      })
    }
  }
}

// Nested indexed (depth 2): the depth-N demonstration. For each driver,
// for each of that driver's claims, an indexed collection of other
// parties involved in that claim.
//
// Outer level: driver id (derived from driver).
// Mid level:   claim id (derived from driverClaim; scoped to this
//              driver's claim collection).
// Inner level: party id (user-driven; user adds / removes parties).
//
// The applyTo function walks all three controllers to build a
// three-level FulfilmentState tree. Party values are opaque; tests use
// a realistic shape like { name, role } but nothing checks fields.
export const driverClaimOtherParty = {
  id: 'a0123456-789a-4678-9abc-def012345678',
  name: 'driverClaimOtherParty',
  group: 'driver',
  cardinality: 'indexed',
  indexedBy: {
    source: 'derived',
    controllingObligation: 'driver',
    mutability: 'edit-only',
    nested: [
      {
        source: 'derived',
        controllingObligation: 'driverClaim',
        mutability: 'edit-only'
      },
      { source: 'user', mutability: 'edit-add-remove' }
    ]
  },
  applyTo: (fulfilments) => {
    const driverIds = Object.keys(fulfilments[driver.id] ?? {})
    const claimsByDriver = fulfilments[driverClaim.id] ?? {}
    const stored = fulfilments[driverClaimOtherParty.id] ?? {}
    return {
      inScope: true,
      fulfilments: driverIds.map((driverFulfilmentId) => {
        const perDriver = stored[driverFulfilmentId] ?? {}
        const claimIds = Object.keys(claimsByDriver[driverFulfilmentId] ?? {})
        return {
          fulfilmentId: driverFulfilmentId,
          subFulfilments: claimIds.map((claimId) => {
            const perClaim = perDriver[claimId] ?? {}
            return {
              fulfilmentId: claimId,
              subFulfilments: Object.keys(perClaim).map((partyId) => ({
                fulfilmentId: partyId,
                status: 'mandatory'
              }))
            }
          })
        }
      })
    }
  }
}

export const driverGroup = {
  id: '8d9e0f12-3456-4456-8789-abcdef012345',
  name: 'driver',
  cardinality: 'indexed',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' },
  members: [driverFullName, driverAddress, driverClaim, driverClaimOtherParty]
}

export const obligations = [
  fullName,
  preferredName,
  dateOfBirth,
  hasVoluntaryExcess,
  excessAmount,
  hasNamedDriver,
  namedDriverName,
  namedDriverRelationship,
  licenseType,
  licenseCountryIssued,
  hasModifications,
  modifications,
  modificationCost,
  hasClaims,
  claimType,
  claimAmount,
  driver,
  driverFullName,
  driverAddress,
  driverClaim,
  driverClaimOtherParty
]

export const groups = [claimGroup, driverGroup]
