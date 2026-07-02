import { describe, it, expect } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import {
  fullName,
  dateOfBirth,
  hasVoluntaryExcess,
  excessAmount,
  hasNamedDriver,
  namedDriverName,
  licenseType,
  licenseCountryIssued
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

describe('ObligationEvaluator', () => {
  describe('return-shape mechanics', () => {
    it('empty fulfilments → unconditional obligations mandatory; appliesWhen ones out-of-scope; mandatoryWhen ones optional', () => {
      const result = evaluator.evaluate({})

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({
        [fullName.id]: mandatory,
        [dateOfBirth.id]: mandatory,
        [hasVoluntaryExcess.id]: mandatory,
        [excessAmount.id]: outOfScope, // appliesWhen — no voluntary excess set
        [hasNamedDriver.id]: mandatory,
        [namedDriverName.id]: outOfScope, // appliesWhen — no named driver set
        [licenseType.id]: mandatory,
        [licenseCountryIssued.id]: optional // mandatoryWhen — licenseType unset
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
      // Out-of-scope obligations have no reasons either.
      expect(result.obligations[excessAmount.id].reasons).toBeUndefined()
      expect(result.obligations[namedDriverName.id].reasons).toBeUndefined()
      // Optional (mandatoryWhen with condition false) has no reasons.
      expect(
        result.obligations[licenseCountryIssued.id].reasons
      ).toBeUndefined()
    })
  })

  describe('full journey scenario', () => {
    it('all obligations fulfilled with all conditions triggering → holistic state check', () => {
      const fulfilments = {
        [fullName.id]: 'Alex Driver',
        [dateOfBirth.id]: '1985-03-27',
        [hasVoluntaryExcess.id]: true,
        [excessAmount.id]: '250.50',
        [hasNamedDriver.id]: true,
        [namedDriverName.id]: 'Sam Passenger',
        [licenseType.id]: 'other',
        [licenseCountryIssued.id]: 'Germany'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual(fulfilments)
      expect(result.obligations).toEqual({
        [fullName.id]: mandatory,
        [dateOfBirth.id]: mandatory,
        [hasVoluntaryExcess.id]: mandatory,
        [excessAmount.id]: excessAmountApplicable,
        [hasNamedDriver.id]: mandatory,
        [namedDriverName.id]: namedDriverNameApplicable,
        [licenseType.id]: mandatory,
        [licenseCountryIssued.id]: licenseCountryIssuedMandatory
      })
    })
  })
})
