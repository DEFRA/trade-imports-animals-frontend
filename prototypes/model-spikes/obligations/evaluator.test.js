import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import {
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
  driverClaimOtherParty,
  groups
} from './obligations.js'

let evaluator
beforeEach(() => {
  evaluator = createObligationEvaluator()
})

// Common implication constants
const outOfScope = { inScope: false }
const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }

// Reason constants (kept verbatim from applyTo emission)
const excessAmountApplicableReason = {
  code: 'obligation.excessAmount.applicable.becauseVoluntaryExcess',
  explanation: 'excessAmount applies when hasVoluntaryExcess is true'
}
const namedDriverNameApplicableReason = {
  code: 'obligation.namedDriverName.applicable.becauseNamedDriver',
  explanation: 'namedDriverName applies when hasNamedDriver is true'
}
const namedDriverRelationshipApplicableReason = {
  code: 'obligation.namedDriverRelationship.applicable.becauseNamedDriver',
  explanation: 'namedDriverRelationship applies when hasNamedDriver is true'
}
const licenseCountryIssuedMandatoryReason = {
  code: 'obligation.licenseCountryIssued.mandatory.becauseLicenseTypeOther',
  explanation: 'licenseCountryIssued is mandatory when licenseType is other'
}
const modificationsApplicableReason = {
  code: 'obligation.modifications.applicable.becauseHasModifications',
  explanation: 'modifications applies when hasModifications is true'
}
const modificationCostApplicableReason = {
  code: 'obligation.modificationCost.applicable.becauseHasModifications',
  explanation: 'modificationCost applies when hasModifications is true'
}
const claimApplicableReason = {
  code: 'obligation.claim.applicable.becauseHasClaims',
  explanation: 'claim applies when hasClaims is true'
}

const sortedIds = (fulfilments) => fulfilments.map((f) => f.fulfilmentId).sort()

describe('ObligationEvaluator', () => {
  // ---------------------------------------------------------------------------
  // Return-shape mechanics
  // ---------------------------------------------------------------------------

  describe('return shape', () => {
    it('returns { fulfilments, obligations }', () => {
      const result = evaluator.evaluate({})
      expect(result).toHaveProperty('fulfilments')
      expect(result).toHaveProperty('obligations')
    })

    it('obligations map has one entry per manifest obligation', () => {
      const result = evaluator.evaluate({})
      const ids = [
        fullName.id,
        preferredName.id,
        dateOfBirth.id,
        hasVoluntaryExcess.id,
        excessAmount.id,
        hasNamedDriver.id,
        namedDriverName.id,
        namedDriverRelationship.id,
        licenseType.id,
        licenseCountryIssued.id,
        hasModifications.id,
        modifications.id,
        modificationCost.id,
        hasClaims.id,
        claim.id,
        claimType.id,
        claimAmount.id,
        driver.id,
        driverFullName.id,
        driverAddress.id,
        driverClaim.id,
        driverClaimOtherParty.id
      ]
      for (const id of ids) {
        expect(result.obligations).toHaveProperty(id)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Tolerate-and-amend — drop unknown obligation ids
  // ---------------------------------------------------------------------------

  describe('tolerate-and-amend', () => {
    it('drops fulfilments whose id is not in the manifest', () => {
      const result = evaluator.evaluate({
        [fullName.id]: 'Alex',
        'unknown-id-not-in-manifest': 'orphan'
      })
      expect(result.fulfilments).not.toHaveProperty(
        'unknown-id-not-in-manifest'
      )
      expect(result.fulfilments[fullName.id]).toBe('Alex')
    })
  })

  // ---------------------------------------------------------------------------
  // Single-cardinality — unconditional
  // ---------------------------------------------------------------------------

  describe('single-cardinality — unconditional', () => {
    it('fullName is always mandatory', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[fullName.id]).toEqual(mandatory)
    })

    it('dateOfBirth is always mandatory', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[dateOfBirth.id]).toEqual(mandatory)
    })

    it('preferredName is always optional; no reasons emitted', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[preferredName.id]).toEqual(optional)
      expect(result.obligations[preferredName.id].reasons).toBeUndefined()
    })

    it('retains a mandatory single value verbatim', () => {
      const result = evaluator.evaluate({ [fullName.id]: 'Alex Driver' })
      expect(result.fulfilments[fullName.id]).toBe('Alex Driver')
    })

    it('retains an optional single value verbatim', () => {
      const result = evaluator.evaluate({ [preferredName.id]: 'Al' })
      expect(result.fulfilments[preferredName.id]).toBe('Al')
    })
  })

  // ---------------------------------------------------------------------------
  // Single-cardinality — appliesWhen (scope-exit purges the value)
  // ---------------------------------------------------------------------------

  describe('appliesWhen — excessAmount gated on hasVoluntaryExcess', () => {
    it('out of scope when hasVoluntaryExcess is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[excessAmount.id]).toEqual(outOfScope)
    })

    it('out of scope when hasVoluntaryExcess = false', () => {
      const result = evaluator.evaluate({ [hasVoluntaryExcess.id]: false })
      expect(result.obligations[excessAmount.id]).toEqual(outOfScope)
    })

    it('in scope + mandatory + reason when hasVoluntaryExcess = true', () => {
      const result = evaluator.evaluate({ [hasVoluntaryExcess.id]: true })
      expect(result.obligations[excessAmount.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        reasons: [excessAmountApplicableReason]
      })
    })

    it('purges stored value on scope exit', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcess.id]: false,
        [excessAmount.id]: '500'
      })
      expect(result.fulfilments).not.toHaveProperty(excessAmount.id)
    })

    it('preserves stored value while in scope', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcess.id]: true,
        [excessAmount.id]: '500'
      })
      expect(result.fulfilments[excessAmount.id]).toBe('500')
    })
  })

  describe('appliesWhen — namedDriverName gated on hasNamedDriver', () => {
    it('out of scope when hasNamedDriver is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[namedDriverName.id]).toEqual(outOfScope)
    })

    it('in scope + mandatory when hasNamedDriver = true', () => {
      const result = evaluator.evaluate({ [hasNamedDriver.id]: true })
      expect(result.obligations[namedDriverName.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        reasons: [namedDriverNameApplicableReason]
      })
    })

    it('purges stored value on scope exit', () => {
      const result = evaluator.evaluate({
        [hasNamedDriver.id]: false,
        [namedDriverName.id]: 'Sam'
      })
      expect(result.fulfilments).not.toHaveProperty(namedDriverName.id)
    })
  })

  describe('appliesWhen — namedDriverRelationship optional-when-applicable', () => {
    it('out of scope when hasNamedDriver is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[namedDriverRelationship.id]).toEqual(outOfScope)
    })

    it('in scope + OPTIONAL when hasNamedDriver = true', () => {
      const result = evaluator.evaluate({ [hasNamedDriver.id]: true })
      expect(result.obligations[namedDriverRelationship.id]).toEqual({
        inScope: true,
        status: 'optional',
        reasons: [namedDriverRelationshipApplicableReason]
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Single-cardinality — mandatoryWhen (value retained across status flip)
  // ---------------------------------------------------------------------------

  describe('mandatoryWhen — licenseCountryIssued', () => {
    it('optional when licenseType is not "other"', () => {
      const result = evaluator.evaluate({ [licenseType.id]: 'uk' })
      expect(result.obligations[licenseCountryIssued.id]).toEqual(optional)
      expect(
        result.obligations[licenseCountryIssued.id].reasons
      ).toBeUndefined()
    })

    it('mandatory + reason when licenseType = "other"', () => {
      const result = evaluator.evaluate({ [licenseType.id]: 'other' })
      expect(result.obligations[licenseCountryIssued.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        reasons: [licenseCountryIssuedMandatoryReason]
      })
    })

    it('retains value across mandatory → optional flip (no purge)', () => {
      const result = evaluator.evaluate({
        [licenseType.id]: 'uk',
        [licenseCountryIssued.id]: 'France'
      })
      expect(result.fulfilments[licenseCountryIssued.id]).toBe('France')
    })
  })

  // ---------------------------------------------------------------------------
  // Single-cardinality — modifications (appliesWhen with array value)
  // ---------------------------------------------------------------------------

  describe('modifications gated on hasModifications', () => {
    it('out of scope when hasModifications is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[modifications.id]).toEqual(outOfScope)
    })

    it('in scope + mandatory + reason when hasModifications = true', () => {
      const result = evaluator.evaluate({ [hasModifications.id]: true })
      expect(result.obligations[modifications.id]).toEqual({
        inScope: true,
        status: 'mandatory',
        reasons: [modificationsApplicableReason]
      })
    })

    it('retains array value when in scope', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys']
      })
      expect(result.fulfilments[modifications.id]).toEqual(['turbo', 'alloys'])
    })

    it('purges array on scope exit', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: false,
        [modifications.id]: ['turbo']
      })
      expect(result.fulfilments).not.toHaveProperty(modifications.id)
    })
  })

  // ---------------------------------------------------------------------------
  // Derived indexed leaf — modificationCost (ids from `modifications`)
  // ---------------------------------------------------------------------------

  describe('modificationCost — derived indexed leaf', () => {
    it('out of scope when hasModifications is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[modificationCost.id]).toEqual(outOfScope)
    })

    it('empty fulfilments when in scope but modifications is empty', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: []
      })
      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        records: []
      })
    })

    it('lists one fulfilment per selected modification', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys']
      })
      expect(
        sortedIds(result.obligations[modificationCost.id].records)
      ).toEqual(['alloys', 'turbo'])
    })

    it('purges stored cost for an id no longer in modifications', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo'],
        [modificationCost.id]: { turbo: '800', alloys: '200' }
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({ turbo: '800' })
    })

    it('drops all storage when hasModifications flips out', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: false,
        [modificationCost.id]: { turbo: '800' }
      })
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })
  })

  // ---------------------------------------------------------------------------
  // Claim group + field records
  // ---------------------------------------------------------------------------

  describe('claim group + claimType / claimAmount field records', () => {
    it('out of scope when hasClaims is absent', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[claim.id]).toEqual(outOfScope)
      expect(result.obligations[claimType.id]).toEqual(outOfScope)
      expect(result.obligations[claimAmount.id]).toEqual(outOfScope)
    })

    it('empty fulfilments when hasClaims=true but no claims yet', () => {
      const result = evaluator.evaluate({ [hasClaims.id]: true })
      expect(result.obligations[claim.id]).toEqual({
        inScope: true,
        reasons: [claimApplicableReason],
        records: []
      })
      expect(result.obligations[claimType.id]).toEqual({
        inScope: true,
        records: []
      })
      expect(result.obligations[claimAmount.id]).toEqual({
        inScope: true,
        records: []
      })
    })

    it('field records inherit claim instance ids from either descendant', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' }
      })
      expect(sortedIds(result.obligations[claim.id].records)).toEqual(['c1'])
      // Both field records list c1 (from the group's inferred instance set)
      expect(result.obligations[claimType.id].records).toEqual([
        { fulfilmentId: 'c1', status: 'mandatory' }
      ])
      expect(result.obligations[claimAmount.id].records).toEqual([
        { fulfilmentId: 'c1', status: 'mandatory' }
      ])
    })

    it('field records emit no reasons of their own', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' }
      })
      expect(result.obligations[claimType.id].reasons).toBeUndefined()
      expect(result.obligations[claimAmount.id].reasons).toBeUndefined()
    })

    it('scope-exit purges the group and its field-record storage', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: false,
        [claimType.id]: { c1: 'accident' },
        [claimAmount.id]: { c1: '1200' }
      })
      expect(result.fulfilments).not.toHaveProperty(claimType.id)
      expect(result.fulfilments).not.toHaveProperty(claimAmount.id)
      expect(result.obligations[claim.id]).toEqual(outOfScope)
      expect(result.obligations[claimType.id]).toEqual(outOfScope)
    })
  })

  // ---------------------------------------------------------------------------
  // Driver group + driverFullName field + driverAddress indexed leaf
  // ---------------------------------------------------------------------------

  describe('driver group (unconditional) + driverFullName + driverAddress', () => {
    it('driver group is always in scope and lists driver instance ids', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex', d2: 'Sam' }
      })
      expect(sortedIds(result.obligations[driver.id].records)).toEqual([
        'd1',
        'd2'
      ])
      // group instance entries have no per-instance status
      for (const entry of result.obligations[driver.id].records) {
        expect(entry.status).toBeUndefined()
      }
    })

    it('driverFullName field record lists parent group instances with own status', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' }
      })
      expect(result.obligations[driverFullName.id].records).toEqual([
        { fulfilmentId: 'd1', status: 'mandatory' }
      ])
    })

    it('driverAddress indexed leaf lists composite-keyed instances with own status', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverAddress.id]: { 'd1/a1': { line1: '10 High St' } }
      })
      expect(result.obligations[driverAddress.id].records).toEqual([
        { fulfilmentId: 'd1/a1', status: 'mandatory' }
      ])
    })

    it('driverFullName lists ALL drivers even if one has no name yet', () => {
      const result = evaluator.evaluate({
        // d2 has an address but no name yet
        [driverFullName.id]: { d1: 'Alex' },
        [driverAddress.id]: { 'd2/a1': { line1: '20 Broad St' } }
      })
      expect(sortedIds(result.obligations[driverFullName.id].records)).toEqual([
        'd1',
        'd2'
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // Nested group — driverClaim + driverClaimOtherParty
  // ---------------------------------------------------------------------------

  describe('nested group: driverClaim + driverClaimOtherParty', () => {
    it('empty when there are no drivers', () => {
      const result = evaluator.evaluate({})
      expect(result.obligations[driverClaim.id]).toEqual({
        inScope: true,
        records: []
      })
      expect(result.obligations[driverClaimOtherParty.id]).toEqual({
        inScope: true,
        records: []
      })
    })

    it('driverClaim ids include the (driver, claim) prefix from other-party leaves', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': { name: 'Other', role: 'other-driver' }
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1'
      ])
      expect(result.obligations[driverClaimOtherParty.id].records).toEqual([
        { fulfilmentId: 'd1/c1/p1', status: 'mandatory' }
      ])
    })

    it('multiple parties in the same claim collapse to one driverClaim instance', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': { name: 'Party 1' },
          'd1/c1/p2': { name: 'Party 2' }
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1'
      ])
      expect(
        sortedIds(result.obligations[driverClaimOtherParty.id].records)
      ).toEqual(['d1/c1/p1', 'd1/c1/p2'])
    })

    it('two claims for one driver, and a driver with no claims', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex', d2: 'Sam' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': {},
          'd1/c2/p2': {}
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1',
        'd1/c2'
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // groups export
  // ---------------------------------------------------------------------------

  describe('groups export', () => {
    it('includes each obligation with at least one child via `within`', () => {
      expect(groups).toContain(claim)
      expect(groups).toContain(driver)
      expect(groups).toContain(driverClaim)
    })

    it('excludes non-groups (single-cardinality, field records, indexed leaves)', () => {
      expect(groups).not.toContain(fullName)
      expect(groups).not.toContain(claimType) // field record
      expect(groups).not.toContain(driverAddress) // indexed leaf
      expect(groups).not.toContain(modificationCost) // derived indexed leaf
    })
  })
})

// ============================================================================
// FULFILMENT_SHAPES.md — one test per documented state
// ============================================================================

describe('FULFILMENT_SHAPES.md scenarios', () => {
  describe('A. Single-cardinality progression (hasClaims + claim group)', () => {
    it('A0 — nothing answered', () => {
      const result = evaluator.evaluate({})
      expect(result.fulfilments).toEqual({})
    })

    it('A1 — hasClaims = false', () => {
      const result = evaluator.evaluate({ [hasClaims.id]: false })
      expect(result.fulfilments).toEqual({ [hasClaims.id]: false })
      expect(result.obligations[claim.id]).toEqual(outOfScope)
    })

    it('A2 — hasClaims = true; no claim instances yet', () => {
      const result = evaluator.evaluate({ [hasClaims.id]: true })
      expect(result.fulfilments).toEqual({ [hasClaims.id]: true })
      expect(result.obligations[claim.id]).toEqual({
        inScope: true,
        reasons: [claimApplicableReason],
        records: []
      })
    })

    it('A3 — user adds claim c1, answers its type', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' }
      })
      expect(result.fulfilments).toEqual({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' }
      })
      expect(result.obligations[claim.id].records).toEqual([
        { fulfilmentId: 'c1' }
      ])
      expect(result.obligations[claimType.id].records).toEqual([
        { fulfilmentId: 'c1', status: 'mandatory' }
      ])
    })

    it('A4 — user answers amount too', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' },
        [claimAmount.id]: { c1: '1200' }
      })
      expect(result.fulfilments).toEqual({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident' },
        [claimAmount.id]: { c1: '1200' }
      })
      expect(result.obligations[claim.id].records).toEqual([
        { fulfilmentId: 'c1' }
      ])
    })

    it('A5 — user adds a second claim c2', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { c1: 'accident', c2: 'theft' },
        [claimAmount.id]: { c1: '1200', c2: '500' }
      })
      expect(sortedIds(result.obligations[claim.id].records)).toEqual([
        'c1',
        'c2'
      ])
    })
  })

  describe('B. Depth-1 indexed leaf (driver → driverAddress)', () => {
    it('B1 — driver d1 with name', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' }
      })
      expect(result.fulfilments).toEqual({
        [driverFullName.id]: { d1: 'Alex' }
      })
      expect(sortedIds(result.obligations[driver.id].records)).toEqual(['d1'])
      expect(result.obligations[driverAddress.id].records).toEqual([])
    })

    it('B2 — d1 with one address', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverAddress.id]: { 'd1/a1': { line1: '10 High St' } }
      })
      expect(result.obligations[driverAddress.id].records).toEqual([
        { fulfilmentId: 'd1/a1', status: 'mandatory' }
      ])
    })

    it('B3 — d1 with two addresses', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverAddress.id]: {
          'd1/a1': { line1: '10 High St' },
          'd1/a2': { line1: '20 Broad St' }
        }
      })
      expect(sortedIds(result.obligations[driverAddress.id].records)).toEqual([
        'd1/a1',
        'd1/a2'
      ])
    })

    it('B4 — second driver d2, name only; d1 keeps addresses', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex', d2: 'Sam' },
        [driverAddress.id]: {
          'd1/a1': { line1: '10 High St' },
          'd1/a2': { line1: '20 Broad St' }
        }
      })
      expect(sortedIds(result.obligations[driver.id].records)).toEqual([
        'd1',
        'd2'
      ])
      expect(sortedIds(result.obligations[driverFullName.id].records)).toEqual([
        'd1',
        'd2'
      ])
      // driverAddress only lists d1's addresses; d2 has none
      expect(sortedIds(result.obligations[driverAddress.id].records)).toEqual([
        'd1/a1',
        'd1/a2'
      ])
    })
  })

  describe('C. Depth-2 chain (driver → driverClaim → driverClaimOtherParty)', () => {
    it('C1 — driver d1, name only; no claims', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' }
      })
      expect(result.obligations[driverClaim.id].records).toEqual([])
      expect(result.obligations[driverClaimOtherParty.id].records).toEqual([])
    })

    it('C2 — user adds a claim, answers first party p1', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': { name: 'Other Driver', role: 'other-driver' }
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1'
      ])
      expect(result.obligations[driverClaimOtherParty.id].records).toEqual([
        { fulfilmentId: 'd1/c1/p1', status: 'mandatory' }
      ])
    })

    it('C3 — second party in the same claim', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': {},
          'd1/c1/p2': {}
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1'
      ])
      expect(
        sortedIds(result.obligations[driverClaimOtherParty.id].records)
      ).toEqual(['d1/c1/p1', 'd1/c1/p2'])
    })

    it('C4 — second claim c2 with one party', () => {
      const result = evaluator.evaluate({
        [driverFullName.id]: { d1: 'Alex' },
        [driverClaimOtherParty.id]: {
          'd1/c1/p1': {},
          'd1/c1/p2': {},
          'd1/c2/p3': {}
        }
      })
      expect(sortedIds(result.obligations[driverClaim.id].records)).toEqual([
        'd1/c1',
        'd1/c2'
      ])
    })
  })

  describe('D. Purge on gate flip (hasClaims → false)', () => {
    it('flipping hasClaims to false drops every key visiting `claim`', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: false,
        [claimType.id]: { c1: 'accident', c2: 'theft' },
        [claimAmount.id]: { c1: '1200', c2: '500' }
      })
      expect(result.fulfilments).toEqual({ [hasClaims.id]: false })
    })

    it('re-enabling hasClaims after a purge shows an empty claim group (no rehydration)', () => {
      const result = evaluator.evaluate({ [hasClaims.id]: true })
      expect(result.obligations[claim.id].records).toEqual([])
    })
  })

  describe('E. Derived indexed leaf (modificationCost)', () => {
    it('E1 — hasModifications=true, mods=[turbo, alloys]; no cost fulfilments yet', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys']
      })
      expect(
        sortedIds(result.obligations[modificationCost.id].records)
      ).toEqual(['alloys', 'turbo'])
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })

    it('E2 — user answers cost for turbo', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys'],
        [modificationCost.id]: { turbo: '800' }
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({ turbo: '800' })
    })

    it('E3 — user removes alloys, adds suspension; nothing to purge', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'suspension'],
        [modificationCost.id]: { turbo: '800' }
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({ turbo: '800' })
      expect(
        sortedIds(result.obligations[modificationCost.id].records)
      ).toEqual(['suspension', 'turbo'])
    })

    it('E4 — user answers cost for suspension', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'suspension'],
        [modificationCost.id]: { turbo: '800', suspension: '600' }
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({
        turbo: '800',
        suspension: '600'
      })
    })

    it('E5 — user removes turbo; stale cost is purged', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['suspension'],
        [modificationCost.id]: { turbo: '800', suspension: '600' }
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({
        suspension: '600'
      })
    })
  })
})
