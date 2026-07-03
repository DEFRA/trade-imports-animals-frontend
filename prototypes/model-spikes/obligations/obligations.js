/**
 * Obligations — the single source of truth for the Service.
 *
 * Categories (distinguished by shape):
 *
 *   - **Single-cardinality**: one value per Journey. Shape:
 *       { id, name, applyTo(fulfilments) → { inScope, status?, reasons? } }
 *
 *   - **Group**: structural container. Members declare `within: <group>`; the
 *     group itself declares nothing about its members. `applyTo` is optional —
 *     present only where a service-wide gate applies (e.g. `claim` gates on
 *     `hasClaims`). Shape:
 *       { id, name, within?, applyTo?(fulfilments) → { inScope, reasons? } }
 *
 *   - **Field record**: one value per parent-group instance. Shape:
 *       { id, name, within, status }
 *
 *   - **Derived indexed leaf**: authors its own record id set from a
 *     controlling obligation. Shape:
 *       { id, name, within?, status,
 *         indexedBy: { source: 'derived', controllingObligation, mutability },
 *         applyTo(fulfilments) → { inScope, reasons?, records: [id, …] } }
 *
 *   - **User-driven indexed leaf**: user adds/removes instances at the inner
 *     level; ids are opaque and orchestrator-generated. Shape:
 *       { id, name, within, status,
 *         indexedBy: { source: 'user', mutability } }
 *     (applyTo optional — only if a service-wide gate applies.)
 *
 * Storage is flat with composite keys — see FULFILMENT_SHAPES.md.
 *
 * Groups have no storage. Their instance ids are inferred from
 * descendants' composite-key prefixes.
 *
 * Cross-obligation references (`within`, `controllingObligation`) are
 * direct symbol lookups — ESLint catches typos that a name string would
 * silently allow.
 */

// -----------------------------------------------------------------------------
// Single-cardinality — no cross-references
// -----------------------------------------------------------------------------

export const fullName = {
  id: 'e5a1c4d8-3f9b-4e2a-9d7c-1f6b8e0a2c4d',
  name: 'fullName',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// Always-optional: preferredName is always in-scope but never required.
export const preferredName = {
  id: '4d7c1f6b-8e0a-2c4d-9d7c-1f6b8e0a2c4d',
  name: 'preferredName',
  applyTo: () => ({ inScope: true, status: 'optional' })
}

export const dateOfBirth = {
  id: 'b7d3e5f1-9a2c-4b8d-8e0f-3c5a7b9d1e2f',
  name: 'dateOfBirth',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const hasVoluntaryExcess = {
  id: '3a5c7e9b-1d4f-4a6c-8e0f-2b4c6d8e0f2a',
  name: 'hasVoluntaryExcess',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const hasNamedDriver = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  name: 'hasNamedDriver',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const licenseType = {
  id: '9f8e7d6c-5b4a-4392-8175-6c5b4a392817',
  name: 'licenseType',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const hasClaims = {
  id: 'b2a1c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e',
  name: 'hasClaims',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

export const hasModifications = {
  id: '1a2b3c4d-5e6f-4708-8091-2a3b4c5d6e7f',
  name: 'hasModifications',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}

// -----------------------------------------------------------------------------
// Single-cardinality — with cross-references
// -----------------------------------------------------------------------------

// appliesWhen: excessAmount only applies when the user has opted for
// voluntary excess. Scope-exit purges any stored value.
export const excessAmount = {
  id: 'f1e2d3c4-b5a6-4978-8697-1a2b3c4d5e6f',
  name: 'excessAmount',
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

export const namedDriverName = {
  id: 'd1e2f345-6789-4abc-8def-012345678901',
  name: 'namedDriverName',
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

// Optional-when-applicable: same gate as namedDriverName; status is
// optional rather than mandatory.
export const namedDriverRelationship = {
  id: '8e0f1a2b-3c4d-4e5f-6a7b-8c9d0e1f2a3b',
  name: 'namedDriverRelationship',
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

// mandatoryWhen: licenseCountryIssued is always in-scope; only required
// when licenseType is 'other'. Value retained across condition changes.
export const licenseCountryIssued = {
  id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
  name: 'licenseCountryIssued',
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

// appliesWhen: modifications multi-select is only in-scope when the
// user has said they have modifications. Value is an array of strings —
// e.g. ['turbo', 'alloys'].
export const modifications = {
  id: '2b3c4d5e-6f78-4a9b-8c0d-1e2f3a4b5c6d',
  name: 'modifications',
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

// -----------------------------------------------------------------------------
// Derived indexed leaf — modificationCost
// Ids come from the `modifications` multi-select. Composite key length = 1
// (own inner id only; no parent group).
// -----------------------------------------------------------------------------

export const modificationCost = {
  id: '3c4d5e6f-7890-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'modificationCost',
  status: 'mandatory',
  indexedBy: {
    source: 'derived',
    controllingObligation: modifications,
    mutability: 'edit-only'
  },
  applyTo: (fulfilments) => {
    if (fulfilments[hasModifications.id] !== true) {
      return { inScope: false }
    }
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.modificationCost.applicable.becauseHasModifications',
          explanation: 'modificationCost applies when hasModifications is true'
        }
      ],
      records: fulfilments[modifications.id] ?? []
    }
  }
}

// -----------------------------------------------------------------------------
// Claim group (top-level; gated on hasClaims)
// Instance ids inferred from claimType / claimAmount composite-key prefixes.
// -----------------------------------------------------------------------------

export const claim = {
  id: 'c1a2c3d4-0000-4111-8222-333444555666',
  name: 'claim',
  applyTo: (fulfilments) => {
    if (fulfilments[hasClaims.id] !== true) {
      return { inScope: false }
    }
    return {
      inScope: true,
      reasons: [
        {
          code: 'obligation.claim.applicable.becauseHasClaims',
          explanation: 'claim applies when hasClaims is true'
        }
      ]
    }
  }
}

export const claimType = {
  id: 'e8f7d6c5-b4a3-4291-8074-6c5b4a392817',
  name: 'claimType',
  within: claim,
  status: 'mandatory'
}

export const claimAmount = {
  id: 'a9b8c7d6-e5f4-4312-8091-6c5b4a392817',
  name: 'claimAmount',
  within: claim,
  status: 'mandatory'
}

// -----------------------------------------------------------------------------
// Driver group (top-level; structural, no gate)
//
// Children:
//   - driverFullName — field record; one value per driver
//   - driverAddress  — user-driven indexed leaf; addresses per driver
//   - driverClaim    — nested structural group; claims per driver
//     - driverClaimOtherParty — user-driven indexed leaf; other parties
//       per claim per driver
//
// In the spike `driverClaim` has no field records — a claim's presence
// is inferred from at least one `driverClaimOtherParty` under it.
// See FULFILMENT_SHAPES.md §C and "no empty group instances" convention.
// -----------------------------------------------------------------------------

export const driver = {
  id: '5a6b7c8d-9e0f-4123-8456-789abcdef012',
  name: 'driver'
  // no applyTo — always in scope, no reasons
}

export const driverFullName = {
  id: '6b7c8d9e-0f12-4234-8567-89abcdef0123',
  name: 'driverFullName',
  within: driver,
  status: 'mandatory'
}

export const driverAddress = {
  id: '7c8d9e0f-1234-4345-8678-9abcdef01234',
  name: 'driverAddress',
  within: driver,
  status: 'mandatory',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' }
}

export const driverClaim = {
  id: '9e0f1234-5678-4567-89ab-cdef01234567',
  name: 'driverClaim',
  within: driver
  // no applyTo — always in scope given driver
  // no field records in this spike
}

export const driverClaimOtherParty = {
  id: 'a0123456-789a-4678-9abc-def012345678',
  name: 'driverClaimOtherParty',
  within: driverClaim,
  status: 'mandatory',
  indexedBy: { source: 'user', mutability: 'edit-add-remove' }
}

// -----------------------------------------------------------------------------
// Manifest — order does not affect evaluation (evaluator builds the group
// hierarchy via `within` back-references).
// -----------------------------------------------------------------------------

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
  claim,
  claimType,
  claimAmount,
  driver,
  driverFullName,
  driverAddress,
  driverClaim,
  driverClaimOtherParty
]

// Groups are obligations that other obligations reference via `within`.
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
