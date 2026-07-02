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

// The evaluator is stateless once constructed — one instance suffices for the
// whole suite. Constructed with no args so it uses the shipped obligations.
const evaluator = createObligationEvaluator()

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }
const excessMandatoryWithReason = {
  inScope: true,
  status: 'mandatory',
  reasons: [
    {
      code: 'obligation.excessAmount.mandatory.becauseVoluntaryExcess',
      explanation: 'excessAmount is mandatory when hasVoluntaryExcess is true'
    }
  ]
}

describe('ObligationEvaluator', () => {
  describe('return-shape mechanics (iteration 1)', () => {
    it('empty fulfilments → all in-scope; unconditional obligations mandatory; excessAmount optional (no voluntary excess set)', () => {
      const result = evaluator.evaluate({})

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({
        [fullNameId]: mandatory,
        [dateOfBirthId]: mandatory,
        [hasVoluntaryExcessId]: mandatory,
        [excessAmountId]: optional
      })
    })

    it('unknown fulfilment id → dropped from amended; obligation state unchanged', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        'unknown-obligation-id': 'stray value'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
      expect(result.obligations).toEqual({
        [fullNameId]: mandatory,
        [dateOfBirthId]: mandatory,
        [hasVoluntaryExcessId]: mandatory,
        [excessAmountId]: optional
      })
    })

    it('fulfilments are keyed by stable id, not by name → name-keyed entries are dropped by tolerate-and-amend', () => {
      // Doc's readability convention shows outer keys as `name` values in
      // examples; real storage / real code uses `id` (see §Persistence →
      // Obligation identifiers). Verify: id-keyed entries pass through;
      // name-keyed entries are treated as unknown and dropped.
      const fulfilments = {
        [fullNameId]: 'Alex Driver', // keyed by id — passes through
        dateOfBirth: '1985-03-27' // keyed by name — dropped
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
    })

    it('empty obligations model → amended empty regardless of input; obligation state empty', () => {
      const emptyEvaluator = createObligationEvaluator({ obligations: [] })

      const result = emptyEvaluator.evaluate({
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27'
      })

      expect(result.fulfilments).toEqual({})
      expect(result.obligations).toEqual({})
    })

    it('idempotent → calling twice yields structurally equal outputs', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27',
        [hasVoluntaryExcessId]: true,
        [excessAmountId]: '250'
      }

      const first = evaluator.evaluate(fulfilments)
      const second = evaluator.evaluate(fulfilments)

      expect(second).toEqual(first)
    })
  })

  describe('conditional mandate + reason emission (iteration 2)', () => {
    it('hasVoluntaryExcess = true → excessAmount becomes mandatory with authored reason', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27',
        [hasVoluntaryExcessId]: true,
        [excessAmountId]: '250.50'
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.fulfilments).toEqual(fulfilments)
      expect(result.obligations).toEqual({
        [fullNameId]: mandatory,
        [dateOfBirthId]: mandatory,
        [hasVoluntaryExcessId]: mandatory,
        [excessAmountId]: excessMandatoryWithReason
      })
    })

    it('hasVoluntaryExcess = false → excessAmount stays optional, no reasons emitted', () => {
      const fulfilments = {
        [fullNameId]: 'Alex Driver',
        [dateOfBirthId]: '1985-03-27',
        [hasVoluntaryExcessId]: false
      }

      const result = evaluator.evaluate(fulfilments)

      expect(result.obligations[excessAmountId]).toEqual(optional)
    })

    it('hasVoluntaryExcess absent from fulfilments → excessAmount stays optional (undefined !== true)', () => {
      const result = evaluator.evaluate({ [fullNameId]: 'Alex Driver' })

      expect(result.obligations[excessAmountId]).toEqual(optional)
    })

    it('reason shape matches §J exactly → { code, explanation }, no values field, no extras', () => {
      const result = evaluator.evaluate({ [hasVoluntaryExcessId]: true })

      const reasons = result.obligations[excessAmountId].reasons
      expect(reasons).toHaveLength(1)
      expect(Object.keys(reasons[0]).sort()).toEqual(['code', 'explanation'])
      expect(reasons[0].code).toBe(
        'obligation.excessAmount.mandatory.becauseVoluntaryExcess'
      )
      expect(reasons[0].explanation).toBe(
        'excessAmount is mandatory when hasVoluntaryExcess is true'
      )
    })

    it('unconditional mandatory obligations do not emit reasons → provenance is only for state changes', () => {
      const result = evaluator.evaluate({})

      expect(result.obligations[fullNameId].reasons).toBeUndefined()
      expect(result.obligations[dateOfBirthId].reasons).toBeUndefined()
      expect(result.obligations[hasVoluntaryExcessId].reasons).toBeUndefined()
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
