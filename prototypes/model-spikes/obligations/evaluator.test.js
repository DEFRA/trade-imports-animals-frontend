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
  hasClaims,
  claimType,
  claimAmount,
  claimGroup,
  groups
} from './obligations.js'

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
        [hasClaims.id]: mandatory,
        [claimType.id]: outOfScope, // group member — hasClaims not set
        [claimAmount.id]: outOfScope // group member — hasClaims not set
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

  describe('full journey scenario', () => {
    it('all obligations fulfilled with all conditions triggering → holistic state check', () => {
      const firstClaimId = '01H8XK7M5RW6QYJ2AB'
      const secondClaimId = '01H8XK9P3T8WBZN4DE'

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
        [hasClaims.id]: true,
        [claimType.id]: {
          [firstClaimId]: 'accident',
          [secondClaimId]: 'theft'
        },
        [claimAmount.id]: {
          [firstClaimId]: '1200',
          [secondClaimId]: '500'
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
        }
      })
    })
  })
})
