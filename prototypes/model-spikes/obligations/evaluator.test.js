import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const obligations = JSON.parse(
  fs.readFileSync(path.join(dirname, 'obligations.json'), 'utf8')
)

const idOf = (name) => obligations.find((o) => o.name === name).id
const fullNameId = idOf('fullName')
const dateOfBirthId = idOf('dateOfBirth')
const hasVoluntaryExcessId = idOf('hasVoluntaryExcess')
const excessAmountId = idOf('excessAmount')
const hasNamedDriverId = idOf('hasNamedDriver')
const namedDriverNameId = idOf('namedDriverName')
const licenseTypeId = idOf('licenseType')
const licenseCountryIssuedId = idOf('licenseCountryIssued')

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
        [fullNameId]: mandatory,
        [dateOfBirthId]: mandatory,
        [hasVoluntaryExcessId]: mandatory,
        [excessAmountId]: outOfScope, // appliesWhen — no voluntary excess set
        [hasNamedDriverId]: mandatory,
        [namedDriverNameId]: outOfScope, // appliesWhen — no named driver set
        [licenseTypeId]: mandatory,
        [licenseCountryIssuedId]: optional // mandatoryWhen — licenseType unset
      })
    })

    it('unknown fulfilment id → dropped from amended', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        'unknown-obligation-id': 'stray value'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
    })

    it('fulfilments are keyed by stable id, not by name → name-keyed entries are dropped by tolerate-and-amend', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver', // keyed by id — passes through
        dateOfBirth: '1985-03-27' // keyed by name — dropped
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
    })

    it('empty obligations model → amended empty; obligation state empty', () => {
      const emptyEvaluator = createObligationEvaluator({ obligations: [] })

      const result = emptyEvaluator.evaluate({ [fullNameId]: 'Alex Driver' })

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({})
    })

    it('idempotent → calling twice yields structurally equal outputs', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27',
        [hasVoluntaryExcessId]: true,
        [excessAmountId]: '250',
        [hasNamedDriverId]: false,
        [licenseTypeId]: 'full'
      }

      const first = evaluator.evaluate(fulfilments)
      const second = evaluator.evaluate(fulfilments)

      expect(second).toEqual(first)
    })
  })

  describe('appliesWhen (excessAmount) + scope-exit purge', () => {
    it('hasVoluntaryExcess = true → excessAmount in-scope, mandatory, with applicable-reason; value retained', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcessId]: true,
        [excessAmountId]: '250.50'
      })

      expect(result.obligations[excessAmountId]).toEqual(excessAmountApplicable)
      expect(result.fulfilments[excessAmountId]).toBe('250.50')
    })

    it('hasVoluntaryExcess = false + stored excessAmount → excessAmount out-of-scope; value purged', () => {
      const result = evaluator.evaluate({
        [hasVoluntaryExcessId]: false,
        [excessAmountId]: '250'
      })

      expect(result.obligations[excessAmountId]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(excessAmountId)
    })

    it('hasVoluntaryExcess absent → excessAmount out-of-scope', () => {
      const result = evaluator.evaluate({ [excessAmountId]: '250' })

      expect(result.obligations[excessAmountId]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(excessAmountId)
    })
  })

  describe('appliesWhen (namedDriverName) + scope-exit purge', () => {
    it('hasNamedDriver = true → namedDriverName in-scope, mandatory, with applicable-reason; value retained', () => {
      const result = evaluator.evaluate({
        [hasNamedDriverId]: true,
        [namedDriverNameId]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverNameId]).toEqual(
        namedDriverNameApplicable
      )
      expect(result.fulfilments[namedDriverNameId]).toBe('Sam Passenger')
    })

    it('hasNamedDriver = false + stored namedDriverName → out-of-scope; value purged', () => {
      const result = evaluator.evaluate({
        [hasNamedDriverId]: false,
        [namedDriverNameId]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverNameId]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverNameId)
    })

    it('hasNamedDriver absent → namedDriverName out-of-scope', () => {
      const result = evaluator.evaluate({
        [namedDriverNameId]: 'Sam Passenger'
      })

      expect(result.obligations[namedDriverNameId]).toEqual(outOfScope)
      expect(result.fulfilments).not.toHaveProperty(namedDriverNameId)
    })
  })

  describe('purge idempotence', () => {
    it('running evaluate twice with the same stale-value input yields the same amended fulfilments', () => {
      const staleInput = {
        [hasVoluntaryExcessId]: false,
        [excessAmountId]: '250' // stale — should be purged
      }

      const first = evaluator.evaluate(staleInput)
      const second = evaluator.evaluate(first.fulfilments)

      expect(first.fulfilments).toEqual(second.fulfilments)
      expect(first.fulfilments).not.toHaveProperty(excessAmountId)
    })
  })

  describe('mandatoryWhen (licenseCountryIssued) — value retained across condition changes', () => {
    it('licenseType = "other" → licenseCountryIssued mandatory with mandatory-reason', () => {
      const result = evaluator.evaluate({
        [licenseTypeId]: 'other',
        [licenseCountryIssuedId]: 'Germany'
      })

      expect(result.obligations[licenseCountryIssuedId]).toEqual(
        licenseCountryIssuedMandatory
      )
      expect(result.fulfilments[licenseCountryIssuedId]).toBe('Germany')
    })

    it('licenseType = "full" → licenseCountryIssued optional, no reasons; value RETAINED (mandatoryWhen does not purge)', () => {
      const result = evaluator.evaluate({
        [licenseTypeId]: 'full',
        [licenseCountryIssuedId]: 'United Kingdom'
      })

      expect(result.obligations[licenseCountryIssuedId]).toEqual(optional)
      expect(result.fulfilments[licenseCountryIssuedId]).toBe('United Kingdom')
    })

    it('licenseType absent → licenseCountryIssued optional (undefined !== "other")', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[licenseCountryIssuedId]).toEqual(optional)
    })
  })

  describe('reason-shape sanity', () => {
    it('appliesWhen reason shape matches §J → { code, explanation }', () => {
      const result = evaluator.evaluate({ [hasVoluntaryExcessId]: true })
      const reasons = result.obligations[excessAmountId].reasons

      expect(reasons).toHaveLength(1)
      expect(Object.keys(reasons[0]).sort()).toEqual(['code', 'explanation'])
    })

    it('mandatoryWhen reason shape matches §J → { code, explanation }', () => {
      const result = evaluator.evaluate({ [licenseTypeId]: 'other' })
      const reasons = result.obligations[licenseCountryIssuedId].reasons

      expect(reasons).toHaveLength(1)
      expect(Object.keys(reasons[0]).sort()).toEqual(['code', 'explanation'])
    })

    it('unconditional / non-triggered obligations do not emit reasons', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[fullNameId].reasons).toBeUndefined()
      expect(result.obligations[dateOfBirthId].reasons).toBeUndefined()
      expect(result.obligations[hasVoluntaryExcessId].reasons).toBeUndefined()
      expect(result.obligations[hasNamedDriverId].reasons).toBeUndefined()
      expect(result.obligations[licenseTypeId].reasons).toBeUndefined()
      // Out-of-scope obligations have no reasons either.
      expect(result.obligations[excessAmountId].reasons).toBeUndefined()
      expect(result.obligations[namedDriverNameId].reasons).toBeUndefined()
      // Optional (mandatoryWhen with condition false) has no reasons.
      expect(result.obligations[licenseCountryIssuedId].reasons).toBeUndefined()
    })
  })

  describe('full journey scenario', () => {
    it('all obligations fulfilled with all conditions triggering → holistic state check', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27',
        [hasVoluntaryExcessId]: true,
        [excessAmountId]: '250.50',
        [hasNamedDriverId]: true,
        [namedDriverNameId]: 'Sam Passenger',
        [licenseTypeId]: 'other',
        [licenseCountryIssuedId]: 'Germany'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual(fulfilments)
      expect(result.obligations).toEqual({
        [fullNameId]: mandatory,
        [dateOfBirthId]: mandatory,
        [hasVoluntaryExcessId]: mandatory,
        [excessAmountId]: excessAmountApplicable,
        [hasNamedDriverId]: mandatory,
        [namedDriverNameId]: namedDriverNameApplicable,
        [licenseTypeId]: mandatory,
        [licenseCountryIssuedId]: licenseCountryIssuedMandatory
      })
    })
  })

  describe('construction-time validation', () => {
    it('obligation whose name has no evaluator function registered → throws at construction time with the name in the message', () => {
      const unknownObligation = {
        id: 'aaaa1111-bbbb-2222-cccc-333344445555',
        name: 'notRegistered',
        type: 'text',
        cardinality: 'single'
      }

      expect(() =>
        createObligationEvaluator({
          obligations: [...obligations, unknownObligation]
        })
      ).toThrow(/notRegistered/)
    })
  })
})
