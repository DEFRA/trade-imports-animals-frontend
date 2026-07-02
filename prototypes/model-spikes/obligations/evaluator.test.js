import { describe, it, expect } from 'vitest'
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
  claimType,
  claimAmount,
  claimGroup,
  driver,
  driverFullName,
  driverAddress,
  driverGroup,
  groups
} from './obligations/obligations.js'

// The evaluator is stateless once constructed — one instance suffices for the
// whole suite. Constructed with no args so it uses the shipped obligations.
const evaluator = createObligationEvaluator()

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }
const outOfScope = { inScope: false }

const excessAmountApplicable = {
  inScope: true,
  status: 'mandatory',
  reasons: [
    {
      code: 'obligation.excessAmount.applicable.becauseVoluntaryExcess',
      explanation: 'excessAmount applies when hasVoluntaryExcess is true'
    }
  ]
}
const namedDriverNameApplicable = {
  inScope: true,
  status: 'mandatory',
  reasons: [
    {
      code: 'obligation.namedDriverName.applicable.becauseNamedDriver',
      explanation: 'namedDriverName applies when hasNamedDriver is true'
    }
  ]
}
const licenseCountryIssuedMandatory = {
  inScope: true,
  status: 'mandatory',
  reasons: [
    {
      code: 'obligation.licenseCountryIssued.mandatory.becauseLicenseTypeOther',
      explanation: 'licenseCountryIssued is mandatory when licenseType is other'
    }
  ]
}
const namedDriverRelationshipApplicable = {
  inScope: true,
  status: 'optional',
  reasons: [
    {
      code: 'obligation.namedDriverRelationship.applicable.becauseNamedDriver',
      explanation: 'namedDriverRelationship applies when hasNamedDriver is true'
    }
  ]
}
const modificationsApplicable = {
  inScope: true,
  status: 'mandatory',
  reasons: [
    {
      code: 'obligation.modifications.applicable.becauseHasModifications',
      explanation: 'modifications applies when hasModifications is true'
    }
  ]
}
const modificationCostApplicableReason = {
  code: 'obligation.modificationCost.applicable.becauseHasModifications',
  explanation: 'modificationCost applies when hasModifications is true'
}
const claimTypeApplicableReason = {
  code: 'obligation.claimType.applicable.becauseHasClaims',
  explanation: 'claimType applies when hasClaims is true'
}
const claimAmountApplicableReason = {
  code: 'obligation.claimAmount.applicable.becauseHasClaims',
  explanation: 'claimAmount applies when hasClaims is true'
}

describe('ObligationEvaluator', () => {
  describe('return-shape mechanics', () => {
    it('empty fulfilments → unconditional obligations mandatory; appliesWhen ones out-of-scope; mandatoryWhen ones optional', () => {
      const result = evaluator.evaluate({})

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({
        [fullName.id]: mandatory,
        [preferredName.id]: optional, // always in-scope, always optional
        [dateOfBirth.id]: mandatory,
        [hasVoluntaryExcess.id]: mandatory,
        [excessAmount.id]: outOfScope, // appliesWhen — no voluntary excess set
        [hasNamedDriver.id]: mandatory,
        [namedDriverName.id]: outOfScope, // appliesWhen — no named driver set
        [namedDriverRelationship.id]: outOfScope, // optional-when-applicable — no named driver set
        [licenseType.id]: mandatory,
        [licenseCountryIssued.id]: optional, // mandatoryWhen — licenseType unset
        [hasModifications.id]: mandatory,
        [modifications.id]: outOfScope, // appliesWhen — no modifications opt-in
        [modificationCost.id]: outOfScope, // derived; gated by hasModifications
        [hasClaims.id]: mandatory,
        [claimType.id]: outOfScope, // group member — hasClaims not set
        [claimAmount.id]: outOfScope, // group member — hasClaims not set
        [driver.id]: { inScope: true, fulfilments: [] }, // no drivers yet
        [driverFullName.id]: { inScope: true, fulfilments: [] },
        [driverAddress.id]: { inScope: true, fulfilments: [] }
      })
    })

    it('unknown fulfilment id → dropped from amended', () => {
      const fulfilments = {
        [fullName.id]: 'Alex Driver',
        'unknown-obligation-id': 'stray value'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullName.id]: 'Alex Driver' })
    })

    it('fulfilments are keyed by stable id, not by name → name-keyed entries are dropped by tolerate-and-amend', () => {
      const fulfilments = {
        [fullName.id]: 'Alex Driver', // keyed by id — passes through
        dateOfBirth: '1985-03-27' // keyed by name — dropped
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullName.id]: 'Alex Driver' })
    })

    it('empty obligations model → amended empty; obligation state empty', () => {
      const emptyEvaluator = createObligationEvaluator({ obligations: [] })

      const result = emptyEvaluator.evaluate({ [fullName.id]: 'Alex Driver' })

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({})
    })

    it('idempotent → calling twice yields structurally equal outputs', () => {
      const fulfilments = {
        [fullName.id]: 'Alex Driver',
        [dateOfBirth.id]: '1985-03-27',
        [hasVoluntaryExcess.id]: true,
        [excessAmount.id]: '250',
        [hasNamedDriver.id]: false,
        [licenseType.id]: 'full'
      }

      const first = evaluator.evaluate(fulfilments)
      const second = evaluator.evaluate(fulfilments)

      expect(second).toEqual(first)
    })
  })

  describe('appliesWhen (excessAmount) + scope-exit purge', () => {
    it('hasVoluntaryExcess = true → excessAmount in-scope, mandatory, with applicable-reason; value retained', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcess.id]: true,
        [excessAmount.id]: '250.50'
      })

      expect(result.obligations[excessAmount.id]).toEqual(
        excessAmountApplicable
      )
      expect(result.fulfilments[excessAmount.id]).toBe('250.50')
    })

    it('hasVoluntaryExcess = false + stored excessAmount → excessAmount out-of-scope; value purged', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcess.id]: false,
        [excessAmount.id]: '250'
      })

      expect(result.obligations[excessAmount.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(excessAmount.id)
    })

    it('hasVoluntaryExcess absent → excessAmount out-of-scope', () => {
      const result = evaluator.evaluate({ [excessAmount.id]: '250' })

      expect(result.obligations[excessAmount.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(excessAmount.id)
    })
  })

  describe('always-optional (preferredName)', () => {
    it('empty fulfilments → in-scope, optional, no reasons', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[preferredName.id]).toEqual(optional)
    })

    it('value present → value passes through; state unchanged', () => {
      const result = evaluator.evaluate({ [preferredName.id]: 'Alex' })

      expect(result.obligations[preferredName.id]).toEqual(optional)
      expect(result.fulfilments[preferredName.id]).toBe('Alex')
    })
  })

  describe('appliesWhen (namedDriverName) + scope-exit purge', () => {
    it('hasNamedDriver = true → namedDriverName in-scope, mandatory, with applicable-reason; value retained', () => {
      const result = evaluator.evaluate({
        [hasNamedDriver.id]: true,
        [namedDriverName.id]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverName.id]).toEqual(
        namedDriverNameApplicable
      )
      expect(result.fulfilments[namedDriverName.id]).toBe('Sam Passenger')
    })

    it('hasNamedDriver = false + stored namedDriverName → out-of-scope; value purged', () => {
      const result = evaluator.evaluate({
        [hasNamedDriver.id]: false,
        [namedDriverName.id]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverName.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverName.id)
    })

    it('hasNamedDriver absent → namedDriverName out-of-scope', () => {
      const result = evaluator.evaluate({
        [namedDriverName.id]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverName.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverName.id)
    })
  })

  describe('optional-when-applicable (namedDriverRelationship) + scope-exit purge', () => {
    it('hasNamedDriver = true → namedDriverRelationship in-scope, OPTIONAL, with applicable-reason', () => {
      const result = evaluator.evaluate({
        [hasNamedDriver.id]: true,
        [namedDriverRelationship.id]: 'spouse'
      })

      expect(result.obligations[namedDriverRelationship.id]).toEqual(
        namedDriverRelationshipApplicable
      )
      expect(result.fulfilments[namedDriverRelationship.id]).toBe('spouse')
    })

    it('hasNamedDriver = true + no value → in-scope, OPTIONAL, no fulfilment; still valid because it is optional', () => {
      const result = evaluator.evaluate({ [hasNamedDriver.id]: true })

      expect(result.obligations[namedDriverRelationship.id]).toEqual(
        namedDriverRelationshipApplicable
      )
      expect(result.fulfilments).not.toHaveProperty(namedDriverRelationship.id)
    })

    it('hasNamedDriver = false + stored namedDriverRelationship → out-of-scope; value purged', () => {
      const result = evaluator.evaluate({
        [hasNamedDriver.id]: false,
        [namedDriverRelationship.id]: 'spouse'
      })

      expect(result.obligations[namedDriverRelationship.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverRelationship.id)
    })

    it('hasNamedDriver absent → namedDriverRelationship out-of-scope', () => {
      const result = evaluator.evaluate({
        [namedDriverRelationship.id]: 'spouse'
      })

      expect(result.obligations[namedDriverRelationship.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverRelationship.id)
    })
  })

  describe('purge idempotence', () => {
    it('running evaluate twice with the same stale-value input yields the same amended fulfilments', () => {
      const staleInput = {
        [hasVoluntaryExcess.id]: false,
        [excessAmount.id]: '250' // stale — should be purged
      }

      const first = evaluator.evaluate(staleInput)
      const second = evaluator.evaluate(first.fulfilments)

      expect(first.fulfilments).toEqual(second.fulfilments)
      expect(first.fulfilments).not.toHaveProperty(excessAmount.id)
    })
  })

  describe('mandatoryWhen (licenseCountryIssued) — value retained across condition changes', () => {
    it('licenseType = "other" → licenseCountryIssued mandatory with mandatory-reason', () => {
      const result = evaluator.evaluate({
        [licenseType.id]: 'other',
        [licenseCountryIssued.id]: 'Germany'
      })

      expect(result.obligations[licenseCountryIssued.id]).toEqual(
        licenseCountryIssuedMandatory
      )
      expect(result.fulfilments[licenseCountryIssued.id]).toBe('Germany')
    })

    it('licenseType = "full" → licenseCountryIssued optional, no reasons; value RETAINED (mandatoryWhen does not purge)', () => {
      const result = evaluator.evaluate({
        [licenseType.id]: 'full',
        [licenseCountryIssued.id]: 'United Kingdom'
      })

      expect(result.obligations[licenseCountryIssued.id]).toEqual(optional)
      expect(result.fulfilments[licenseCountryIssued.id]).toBe('United Kingdom')
    })

    it('licenseType absent → licenseCountryIssued optional (undefined !== "other")', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[licenseCountryIssued.id]).toEqual(optional)
    })
  })

  describe('appliesWhen + derived indexing (modifications / modificationCost) — gated by hasModifications', () => {
    it('hasModifications = true + no controller value → modifications in-scope with reason; derived in-scope with empty fulfilments', () => {
      const result = evaluator.evaluate({ [hasModifications.id]: true })

      expect(result.obligations[modifications.id]).toEqual(
        modificationsApplicable
      )
      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: []
      })
      expect(result.fulfilments).not.toHaveProperty(modifications.id)
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })

    it('controller with one value + no cost stored → derived has one fresh blank slot; nothing in amended', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo']
      })

      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: [{ fulfilmentId: 'turbo', status: 'mandatory' }]
      })
      expect(result.fulfilments[modifications.id]).toEqual(['turbo'])
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })

    it('controller with values + cost values stored → derived reflects controller; values pass through', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys'],
        [modificationCost.id]: { turbo: '800', alloys: '200' }
      })

      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: [
          { fulfilmentId: 'turbo', status: 'mandatory' },
          { fulfilmentId: 'alloys', status: 'mandatory' }
        ]
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({
        turbo: '800',
        alloys: '200'
      })
    })

    it('controller value removed → corresponding cost fulfilment PURGED (derived lifecycle)', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo'], // user removed 'alloys'
        [modificationCost.id]: { turbo: '800', alloys: '200' } // stale 'alloys' still stored
      })

      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: [{ fulfilmentId: 'turbo', status: 'mandatory' }]
      })
      // 'alloys' cost purged; 'turbo' retained.
      expect(result.fulfilments[modificationCost.id]).toEqual({ turbo: '800' })
    })

    it('controller emptied + stale cost values → all cost fulfilments purged', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: [],
        [modificationCost.id]: { turbo: '800', alloys: '200' }
      })

      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: []
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({})
    })

    it('re-adding a controller value after removal → fresh blank (no rehydration; evaluator has no memory)', () => {
      // First: user has 'turbo' + 'alloys' with costs. Then user removes 'alloys'.
      // Then user re-adds 'alloys'. Under our stateless evaluator, the "re-add"
      // is just the current state — 'alloys' present in controller, no cost
      // stored. Cost fulfilment is a fresh blank.
      const result = evaluator.evaluate({
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys'], // re-added
        [modificationCost.id]: { turbo: '800' } // no 'alloys' cost (it was purged on remove)
      })

      expect(result.obligations[modificationCost.id]).toEqual({
        inScope: true,
        reasons: [modificationCostApplicableReason],
        fulfilments: [
          { fulfilmentId: 'turbo', status: 'mandatory' },
          { fulfilmentId: 'alloys', status: 'mandatory' } // fresh blank slot
        ]
      })
      expect(result.fulfilments[modificationCost.id]).toEqual({ turbo: '800' })
    })

    it('hasModifications = false + stored controller + costs → both purged (gate flips false)', () => {
      const result = evaluator.evaluate({
        [hasModifications.id]: false,
        [modifications.id]: ['turbo', 'alloys'],
        [modificationCost.id]: { turbo: '800', alloys: '200' }
      })

      expect(result.obligations[modifications.id]).toEqual(outOfScope)
      expect(result.obligations[modificationCost.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(modifications.id)
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })

    it('hasModifications absent → both out-of-scope; no keys in amended', () => {
      const result = evaluator.evaluate({
        [modifications.id]: ['turbo'],
        [modificationCost.id]: { turbo: '800' }
      })

      expect(result.obligations[modifications.id]).toEqual(outOfScope)
      expect(result.obligations[modificationCost.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(modifications.id)
      expect(result.fulfilments).not.toHaveProperty(modificationCost.id)
    })
  })

  describe('appliesWhen + indexed (claim group) — gated by hasClaims; user-driven; shared fulfilmentIds across members', () => {
    const firstClaimId = '01H8XK7M5RW6QYJ2AB'
    const secondClaimId = '01H8XK9P3T8WBZN4DE'

    const claimTypeApplicable = (fulfilmentIds) => ({
      inScope: true,
      reasons: [claimTypeApplicableReason],
      fulfilments: fulfilmentIds.map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    })
    const claimAmountApplicable = (fulfilmentIds) => ({
      inScope: true,
      reasons: [claimAmountApplicableReason],
      fulfilments: fulfilmentIds.map((fulfilmentId) => ({
        fulfilmentId,
        status: 'mandatory'
      }))
    })

    it('hasClaims = true + empty collections → both members in-scope with empty fulfilments arrays; no keys in amended', () => {
      const result = evaluator.evaluate({ [hasClaims.id]: true })

      expect(result.obligations[claimType.id]).toEqual(claimTypeApplicable([]))
      expect(result.obligations[claimAmount.id]).toEqual(
        claimAmountApplicable([])
      )
      expect(result.fulfilments).not.toHaveProperty(claimType.id)
      expect(result.fulfilments).not.toHaveProperty(claimAmount.id)
    })

    it('hasClaims = true + one claim (shared fulfilmentId) → both members show one per-fulfilment entry; values retained', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: { [firstClaimId]: 'accident' },
        [claimAmount.id]: { [firstClaimId]: '1200' }
      })

      expect(result.obligations[claimType.id]).toEqual(
        claimTypeApplicable([firstClaimId])
      )
      expect(result.obligations[claimAmount.id]).toEqual(
        claimAmountApplicable([firstClaimId])
      )
      expect(result.fulfilments[claimType.id]).toEqual({
        [firstClaimId]: 'accident'
      })
      expect(result.fulfilments[claimAmount.id]).toEqual({
        [firstClaimId]: '1200'
      })
    })

    it('hasClaims = true + two claims (shared fulfilmentIds) → both members show two entries; values pass through', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: true,
        [claimType.id]: {
          [firstClaimId]: 'accident',
          [secondClaimId]: 'theft'
        },
        [claimAmount.id]: {
          [firstClaimId]: '1200',
          [secondClaimId]: '500'
        }
      })

      expect(result.obligations[claimType.id]).toEqual(
        claimTypeApplicable([firstClaimId, secondClaimId])
      )
      expect(result.obligations[claimAmount.id]).toEqual(
        claimAmountApplicable([firstClaimId, secondClaimId])
      )
      expect(result.fulfilments[claimType.id]).toEqual({
        [firstClaimId]: 'accident',
        [secondClaimId]: 'theft'
      })
      expect(result.fulfilments[claimAmount.id]).toEqual({
        [firstClaimId]: '1200',
        [secondClaimId]: '500'
      })
    })

    it('hasClaims = false + stored claim fulfilments → both members out-of-scope; both collections PURGED', () => {
      const result = evaluator.evaluate({
        [hasClaims.id]: false,
        [claimType.id]: { [firstClaimId]: 'accident' },
        [claimAmount.id]: { [firstClaimId]: '1200' }
      })

      expect(result.obligations[claimType.id]).toEqual(outOfScope)
      expect(result.obligations[claimAmount.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(claimType.id)
      expect(result.fulfilments).not.toHaveProperty(claimAmount.id)
    })

    it('hasClaims absent → both members out-of-scope; no keys in amended', () => {
      const result = evaluator.evaluate({
        [claimType.id]: { [firstClaimId]: 'accident' },
        [claimAmount.id]: { [firstClaimId]: '1200' }
      })

      expect(result.obligations[claimType.id]).toEqual(outOfScope)
      expect(result.obligations[claimAmount.id]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(claimType.id)
      expect(result.fulfilments).not.toHaveProperty(claimAmount.id)
    })
  })

  describe('claim group — metadata', () => {
    it('claimGroup declares its members', () => {
      expect(claimGroup.members).toEqual([claimType, claimAmount])
    })

    it('claim group members back-reference the group by name', () => {
      expect(claimType.group).toBe('claim')
      expect(claimAmount.group).toBe('claim')
    })

    it('groups export lists the claim group', () => {
      expect(groups).toContain(claimGroup)
    })
  })

  describe('reason-shape sanity', () => {
    it('appliesWhen reason shape matches §J → { code, explanation }', () => {
      const result = evaluator.evaluate({ [hasVoluntaryExcess.id]: true })
      const reasons = result.obligations[excessAmount.id].reasons

      expect(reasons).toHaveLength(1)
      expect(Object.keys(reasons[0]).sort()).toEqual(['code', 'explanation'])
    })

    it('mandatoryWhen reason shape matches §J → { code, explanation }', () => {
      const result = evaluator.evaluate({ [licenseType.id]: 'other' })
      const reasons = result.obligations[licenseCountryIssued.id].reasons

      expect(reasons).toHaveLength(1)
      expect(Object.keys(reasons[0]).sort()).toEqual(['code', 'explanation'])
    })

    it('unconditional / non-triggered obligations do not emit reasons', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[fullName.id].reasons).toBeUndefined()
      expect(result.obligations[dateOfBirth.id].reasons).toBeUndefined()
      expect(result.obligations[hasVoluntaryExcess.id].reasons).toBeUndefined()
      expect(result.obligations[hasNamedDriver.id].reasons).toBeUndefined()
      expect(result.obligations[licenseType.id].reasons).toBeUndefined()
      expect(result.obligations[hasClaims.id].reasons).toBeUndefined()
      // Out-of-scope obligations have no reasons either.
      expect(result.obligations[excessAmount.id].reasons).toBeUndefined()
      expect(result.obligations[namedDriverName.id].reasons).toBeUndefined()
      expect(result.obligations[claimType.id].reasons).toBeUndefined()
      expect(result.obligations[claimAmount.id].reasons).toBeUndefined()
      // Optional (mandatoryWhen with condition false) has no reasons.
      expect(
        result.obligations[licenseCountryIssued.id].reasons
      ).toBeUndefined()
    })
  })

  describe('nested indexing (drivers × address history)', () => {
    const firstDriverId = '01H8XKAAA00000000000AA'
    const secondDriverId = '01H8XKBBB00000000000BB'
    const addr1a = '01H8XKAA111111111111AA'
    const addr1b = '01H8XKAA222222222222BB'
    const addr2a = '01H8XKBB111111111111AA'

    const addressAtDowning = {
      line1: '10 Downing St',
      town: 'London',
      postcode: 'SW1A 2AA',
      country: 'United Kingdom',
      from: '2020-01-01',
      to: '2023-06-30'
    }
    const addressAtBaker = {
      line1: '221B Baker St',
      town: 'London',
      postcode: 'NW1 6XE',
      country: 'United Kingdom',
      from: '2023-07-01',
      to: null
    }
    const addressForSam = {
      line1: '1 Somewhere Ln',
      town: 'Bristol',
      postcode: 'BS1 1AA',
      country: 'United Kingdom',
      from: '2020-05-01',
      to: null
    }

    it('empty fulfilments → driver, driverFullName, driverAddress all in-scope with empty fulfilments arrays', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[driver.id]).toEqual({
        inScope: true,
        fulfilments: []
      })
      expect(result.obligations[driverFullName.id]).toEqual({
        inScope: true,
        fulfilments: []
      })
      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: []
      })
      expect(result.fulfilments).not.toHaveProperty(driver.id)
      expect(result.fulfilments).not.toHaveProperty(driverFullName.id)
      expect(result.fulfilments).not.toHaveProperty(driverAddress.id)
    })

    it('one driver, no other data → driver has one fulfilment; driverFullName has one blank slot; driverAddress has one entry with empty subFulfilments', () => {
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} }
      })

      expect(result.obligations[driver.id]).toEqual({
        inScope: true,
        fulfilments: [{ fulfilmentId: firstDriverId, status: 'mandatory' }]
      })
      expect(result.obligations[driverFullName.id]).toEqual({
        inScope: true,
        fulfilments: [{ fulfilmentId: firstDriverId, status: 'mandatory' }]
      })
      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: [{ fulfilmentId: firstDriverId, subFulfilments: [] }]
      })
      // Only driver's presence marker is in storage.
      expect(result.fulfilments[driver.id]).toEqual({ [firstDriverId]: {} })
      expect(result.fulfilments).not.toHaveProperty(driverFullName.id)
      expect(result.fulfilments).not.toHaveProperty(driverAddress.id)
    })

    it('driver + fullName only → fullName value retained; driverAddress still empty subFulfilments', () => {
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverFullName.id]: { [firstDriverId]: 'Alex Passenger' }
      })

      expect(result.fulfilments[driverFullName.id]).toEqual({
        [firstDriverId]: 'Alex Passenger'
      })
      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: [{ fulfilmentId: firstDriverId, subFulfilments: [] }]
      })
    })

    it('driver + one address → driverAddress has one sub-fulfilment; address value retained', () => {
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverAddress.id]: {
          [firstDriverId]: { [addr1a]: addressAtDowning }
        }
      })

      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: [
          {
            fulfilmentId: firstDriverId,
            subFulfilments: [{ fulfilmentId: addr1a, status: 'mandatory' }]
          }
        ]
      })
      expect(result.fulfilments[driverAddress.id]).toEqual({
        [firstDriverId]: { [addr1a]: addressAtDowning }
      })
    })

    it('driver + two addresses → both addresses in sub-fulfilments; both values retained', () => {
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverAddress.id]: {
          [firstDriverId]: {
            [addr1a]: addressAtDowning,
            [addr1b]: addressAtBaker
          }
        }
      })

      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: [
          {
            fulfilmentId: firstDriverId,
            subFulfilments: [
              { fulfilmentId: addr1a, status: 'mandatory' },
              { fulfilmentId: addr1b, status: 'mandatory' }
            ]
          }
        ]
      })
      expect(result.fulfilments[driverAddress.id]).toEqual({
        [firstDriverId]: {
          [addr1a]: addressAtDowning,
          [addr1b]: addressAtBaker
        }
      })
    })

    it('two drivers with mixed data → each driver’s data preserved independently', () => {
      const result = evaluator.evaluate({
        [driver.id]: {
          [firstDriverId]: {},
          [secondDriverId]: {}
        },
        [driverFullName.id]: {
          [firstDriverId]: 'Alex Passenger',
          [secondDriverId]: 'Sam Passenger'
        },
        [driverAddress.id]: {
          [firstDriverId]: {
            [addr1a]: addressAtDowning,
            [addr1b]: addressAtBaker
          },
          [secondDriverId]: {
            [addr2a]: addressForSam
          }
        }
      })

      expect(result.obligations[driverAddress.id]).toEqual({
        inScope: true,
        fulfilments: [
          {
            fulfilmentId: firstDriverId,
            subFulfilments: [
              { fulfilmentId: addr1a, status: 'mandatory' },
              { fulfilmentId: addr1b, status: 'mandatory' }
            ]
          },
          {
            fulfilmentId: secondDriverId,
            subFulfilments: [{ fulfilmentId: addr2a, status: 'mandatory' }]
          }
        ]
      })
      expect(result.fulfilments[driverFullName.id]).toEqual({
        [firstDriverId]: 'Alex Passenger',
        [secondDriverId]: 'Sam Passenger'
      })
    })

    it('remove one address (stale inner key) → nested purge drops the stale address; other addresses under the same driver retained', () => {
      // User removed addr1b from firstDriver's address list. The stored
      // driverAddress map still has addr1b under firstDriver until the
      // evaluator purges it.
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverAddress.id]: {
          [firstDriverId]: {
            [addr1a]: addressAtDowning
            // addr1b intentionally omitted — represents the "after user removed" state.
            // But we're testing the case where storage still has the stale key.
          }
        }
      })

      expect(result.fulfilments[driverAddress.id]).toEqual({
        [firstDriverId]: { [addr1a]: addressAtDowning }
      })

      // Now the stale-key scenario: storage still has addr1b, but the
      // user's action effectively removed it. Under our stateless
      // evaluator, "the user removed it" translates to "the applyTo
      // reports the current state without it". The applyTo reads
      // stored fulfilments to know which addresses exist, so this
      // stale-key case can only be constructed if state was manually
      // manipulated. Simulate that:
      const staleResult = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverAddress.id]: {
          [firstDriverId]: {
            [addr1a]: addressAtDowning,
            [addr1b]: addressAtBaker // "stale" — imagine user had removed this but state is inconsistent
          }
        }
      })
      // Since applyTo reports both addresses (it reads all stored keys),
      // neither is purged. This test documents that user-driven inner
      // level obligations don't self-purge — the orchestrator controls
      // add/remove.
      expect(staleResult.fulfilments[driverAddress.id]).toEqual({
        [firstDriverId]: {
          [addr1a]: addressAtDowning,
          [addr1b]: addressAtBaker
        }
      })
    })

    it('remove driver (stale outer key) → outer purge drops the driver from driverFullName and driverAddress via the derived-lifecycle rule', () => {
      // driver's collection has only firstDriver; but driverFullName and
      // driverAddress still have stale entries for secondDriver.
      const result = evaluator.evaluate({
        [driver.id]: { [firstDriverId]: {} },
        [driverFullName.id]: {
          [firstDriverId]: 'Alex Passenger',
          [secondDriverId]: 'Stale Sam' // stale — no matching driver
        },
        [driverAddress.id]: {
          [firstDriverId]: { [addr1a]: addressAtDowning },
          [secondDriverId]: { [addr2a]: addressForSam } // stale
        }
      })

      // Rule 2 (outer purge) drops the stale secondDriver from both
      // derived obligations because driverFullName and driverAddress's
      // applyTo only lists firstDriver.
      expect(result.fulfilments[driverFullName.id]).toEqual({
        [firstDriverId]: 'Alex Passenger'
      })
      expect(result.fulfilments[driverAddress.id]).toEqual({
        [firstDriverId]: { [addr1a]: addressAtDowning }
      })
    })

    it('values preserved verbatim under all keys — deep-equal on amended for a two-driver, multi-address case', () => {
      const fulfilments = {
        [driver.id]: {
          [firstDriverId]: {},
          [secondDriverId]: {}
        },
        [driverFullName.id]: {
          [firstDriverId]: 'Alex Passenger',
          [secondDriverId]: 'Sam Passenger'
        },
        [driverAddress.id]: {
          [firstDriverId]: {
            [addr1a]: addressAtDowning,
            [addr1b]: addressAtBaker
          },
          [secondDriverId]: {
            [addr2a]: addressForSam
          }
        }
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments[driver.id]).toEqual(fulfilments[driver.id])
      expect(result.fulfilments[driverFullName.id]).toEqual(
        fulfilments[driverFullName.id]
      )
      expect(result.fulfilments[driverAddress.id]).toEqual(
        fulfilments[driverAddress.id]
      )
    })
  })

  describe('driver group — metadata', () => {
    it('driverGroup declares its members', () => {
      expect(driverGroup.members).toEqual([driverFullName, driverAddress])
    })

    it('driver group members back-reference the group by name', () => {
      expect(driverFullName.group).toBe('driver')
      expect(driverAddress.group).toBe('driver')
    })

    it('groups export lists the driver group', () => {
      expect(groups).toContain(driverGroup)
    })
  })

  describe('full journey scenario', () => {
    it('all obligations fulfilled with all conditions triggering → holistic state check', () => {
      const firstClaimId = '01H8XK7M5RW6QYJ2AB'
      const secondClaimId = '01H8XK9P3T8WBZN4DE'
      const firstDriverId = '01H8XKAAA00000000000AA'
      const secondDriverId = '01H8XKBBB00000000000BB'
      const addr1a = '01H8XKAA111111111111AA'
      const addr2a = '01H8XKBB111111111111AA'
      const addressA = {
        line1: '10 Downing St',
        town: 'London',
        postcode: 'SW1A 2AA',
        country: 'United Kingdom',
        from: '2020-01-01',
        to: null
      }
      const addressB = {
        line1: '1 Somewhere Ln',
        town: 'Bristol',
        postcode: 'BS1 1AA',
        country: 'United Kingdom',
        from: '2020-05-01',
        to: null
      }

      const fulfilments = {
        [fullName.id]: 'Alex Driver',
        [preferredName.id]: 'Alex',
        [dateOfBirth.id]: '1985-03-27',
        [hasVoluntaryExcess.id]: true,
        [excessAmount.id]: '250.50',
        [hasNamedDriver.id]: true,
        [namedDriverName.id]: 'Sam Passenger',
        [namedDriverRelationship.id]: 'spouse',
        [licenseType.id]: 'other',
        [licenseCountryIssued.id]: 'Germany',
        [hasModifications.id]: true,
        [modifications.id]: ['turbo', 'alloys'],
        [modificationCost.id]: { turbo: '800', alloys: '200' },
        [hasClaims.id]: true,
        [claimType.id]: {
          [firstClaimId]: 'accident',
          [secondClaimId]: 'theft'
        },
        [claimAmount.id]: {
          [firstClaimId]: '1200',
          [secondClaimId]: '500'
        },
        [driver.id]: {
          [firstDriverId]: {},
          [secondDriverId]: {}
        },
        [driverFullName.id]: {
          [firstDriverId]: 'Alex Passenger',
          [secondDriverId]: 'Sam Passenger'
        },
        [driverAddress.id]: {
          [firstDriverId]: { [addr1a]: addressA },
          [secondDriverId]: { [addr2a]: addressB }
        }
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual(fulfilments)
      expect(result.obligations).toEqual({
        [fullName.id]: mandatory,
        [preferredName.id]: optional,
        [dateOfBirth.id]: mandatory,
        [hasVoluntaryExcess.id]: mandatory,
        [excessAmount.id]: excessAmountApplicable,
        [hasNamedDriver.id]: mandatory,
        [namedDriverName.id]: namedDriverNameApplicable,
        [namedDriverRelationship.id]: namedDriverRelationshipApplicable,
        [licenseType.id]: mandatory,
        [licenseCountryIssued.id]: licenseCountryIssuedMandatory,
        [hasModifications.id]: mandatory,
        [modifications.id]: modificationsApplicable,
        [modificationCost.id]: {
          inScope: true,
          reasons: [modificationCostApplicableReason],
          fulfilments: [
            { fulfilmentId: 'turbo', status: 'mandatory' },
            { fulfilmentId: 'alloys', status: 'mandatory' }
          ]
        },
        [hasClaims.id]: mandatory,
        [claimType.id]: {
          inScope: true,
          reasons: [claimTypeApplicableReason],
          fulfilments: [
            { fulfilmentId: firstClaimId, status: 'mandatory' },
            { fulfilmentId: secondClaimId, status: 'mandatory' }
          ]
        },
        [claimAmount.id]: {
          inScope: true,
          reasons: [claimAmountApplicableReason],
          fulfilments: [
            { fulfilmentId: firstClaimId, status: 'mandatory' },
            { fulfilmentId: secondClaimId, status: 'mandatory' }
          ]
        },
        [driver.id]: {
          inScope: true,
          fulfilments: [
            { fulfilmentId: firstDriverId, status: 'mandatory' },
            { fulfilmentId: secondDriverId, status: 'mandatory' }
          ]
        },
        [driverFullName.id]: {
          inScope: true,
          fulfilments: [
            { fulfilmentId: firstDriverId, status: 'mandatory' },
            { fulfilmentId: secondDriverId, status: 'mandatory' }
          ]
        },
        [driverAddress.id]: {
          inScope: true,
          fulfilments: [
            {
              fulfilmentId: firstDriverId,
              subFulfilments: [{ fulfilmentId: addr1a, status: 'mandatory' }]
            },
            {
              fulfilmentId: secondDriverId,
              subFulfilments: [{ fulfilmentId: addr2a, status: 'mandatory' }]
            }
          ]
        }
      })
    })
  })
})
