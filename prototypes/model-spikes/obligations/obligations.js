/**
 * Obligations — the single source of truth for the Service.
 *
 * Each obligation is declared as its own named const, carrying identifiers
 * (id, name), data-contract fields (cardinality, indexedBy, group), and the
 * applicability function (`evaluate`) together. Cross-obligation references
 * inside an `evaluate` are direct symbol lookups — e.g.
 * `fulfilments[hasVoluntaryExcess.id]` — so ESLint can catch orphan
 * declarations that the previous name-keyed dynamic dispatch would have
 * silently allowed.
 *
 * Per §Conditional obligation patterns in
 * prototypes/model-spikes/obligations.md, `evaluate` returns
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
  evaluate: () => ({ inScope: true, status: 'mandatory' })
}

export const dateOfBirth = {
  id: 'b7d3e5f1-9a2c-4b8d-8e0f-3c5a7b9d1e2f',
  name: 'dateOfBirth',
  cardinality: 'single',
  evaluate: () => ({ inScope: true, status: 'mandatory' })
}

export const hasVoluntaryExcess = {
  id: '3a5c7e9b-1d4f-4a6c-8e0f-2b4c6d8e0f2a',
  name: 'hasVoluntaryExcess',
  cardinality: 'single',
  evaluate: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen: excessAmount only applies (in-scope) when the user has
// opted for voluntary excess. Scope-exit purges any stored value.
export const excessAmount = {
  id: 'f1e2d3c4-b5a6-4978-8697-1a2b3c4d5e6f',
  name: 'excessAmount',
  cardinality: 'single',
  evaluate: (fulfilments) => {
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
  evaluate: () => ({ inScope: true, status: 'mandatory' })
}

// appliesWhen: namedDriverName only applies when the user has a named
// driver. Scope-exit purges any stored value.
export const namedDriverName = {
  id: 'd1e2f345-6789-4abc-8def-012345678901',
  name: 'namedDriverName',
  cardinality: 'single',
  evaluate: (fulfilments) => {
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

export const licenseType = {
  id: '9f8e7d6c-5b4a-4392-8175-6c5b4a392817',
  name: 'licenseType',
  cardinality: 'single',
  evaluate: () => ({ inScope: true, status: 'mandatory' })
}

// mandatoryWhen: licenseCountryIssued is always in-scope (meaningful for
// anyone — defaults to UK for standard licenses) but only required when
// the license type is 'other'. Value retained across condition changes;
// no purge.
export const licenseCountryIssued = {
  id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
  name: 'licenseCountryIssued',
  cardinality: 'single',
  evaluate: (fulfilments) => {
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

export const hasClaims = {
  id: 'b2a1c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e',
  name: 'hasClaims',
  cardinality: 'single',
  evaluate: () => ({ inScope: true, status: 'mandatory' })
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
  evaluate: (fulfilments) => {
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
  evaluate: (fulfilments) => {
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

export const obligations = [
  fullName,
  dateOfBirth,
  hasVoluntaryExcess,
  excessAmount,
  hasNamedDriver,
  namedDriverName,
  licenseType,
  licenseCountryIssued,
  hasClaims,
  claimType,
  claimAmount
]

export const groups = [claimGroup]
