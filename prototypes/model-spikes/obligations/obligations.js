/**
 * Obligations — the single source of truth for the Service.
 *
 * Each obligation is declared as its own named const, carrying identifiers
 * (id, name), data-contract fields (type, cardinality), and the
 * applicability function (`evaluate`) together. Cross-obligation references
 * inside an `evaluate` are direct symbol lookups — e.g.
 * `fulfilments[hasVoluntaryExcess.id]` — so ESLint can catch orphan
 * declarations that the previous name-keyed dynamic dispatch would have
 * silently allowed.
 *
 * Per §Conditional obligation patterns in
 * prototypes/model-spikes/obligations.md, `evaluate` returns
 * `{ inScope, status?, reasons? }`. The two patterns (mandatoryWhen /
 * appliesWhen) are enacted by the return-shape choice, not by any field on
 * the record.
 *
 * The `obligations` array at the bottom is the manifest — reordering it
 * does not move the definitions above.
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

export const obligations = [
  fullName,
  dateOfBirth,
  hasVoluntaryExcess,
  excessAmount,
  hasNamedDriver,
  namedDriverName,
  licenseType,
  licenseCountryIssued
]
