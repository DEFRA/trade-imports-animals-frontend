import { describe, it, expect, beforeEach } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import {
  countryOfOrigin,
  regionCodeRequirement,
  regionCode
} from './obligations.js'

let evaluator
beforeEach(() => {
  evaluator = createObligationEvaluator()
})

const mandatory = { inScope: true, status: 'mandatory' }
const optional = { inScope: true, status: 'optional' }

const regionCodeRequiredReason = {
  code: 'obligation.regionCode.mandatory.becauseRegionCodeRequired',
  explanation: 'regionCode is mandatory when regionCodeRequirement is yes'
}

describe('V4 smoke — evaluator wires up against fresh manifest', () => {
  it('returns { fulfilments, obligations } for an empty input', () => {
    const result = evaluator.evaluate({})
    expect(result).toEqual({
      fulfilments: {},
      obligations: {
        [countryOfOrigin.id]: mandatory,
        [regionCodeRequirement.id]: mandatory,
        [regionCode.id]: optional
      }
    })
  })

  it('unrecognised obligation ids are dropped (tolerate-and-amend)', () => {
    const result = evaluator.evaluate({ 'not-an-obligation-id': 'anything' })
    expect(result.fulfilments).toEqual({})
  })
})

describe('V4 smoke — countryOfOrigin (always mandatory)', () => {
  it('is mandatory in-scope regardless of stored value', () => {
    const result = evaluator.evaluate({ [countryOfOrigin.id]: 'France' })
    expect(result.fulfilments[countryOfOrigin.id]).toBe('France')
    expect(result.obligations[countryOfOrigin.id]).toEqual(mandatory)
  })
})

describe('V4 smoke — regionCode conditional gate', () => {
  it('is optional in-scope when regionCodeRequirement is absent', () => {
    const result = evaluator.evaluate({})
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })

  it('is optional in-scope when regionCodeRequirement is no', () => {
    const result = evaluator.evaluate({
      [regionCodeRequirement.id]: 'no'
    })
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })

  it('is mandatory in-scope when regionCodeRequirement is yes', () => {
    const result = evaluator.evaluate({
      [regionCodeRequirement.id]: 'yes'
    })
    expect(result.obligations[regionCode.id]).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [regionCodeRequiredReason]
    })
  })

  // Matches the V4 spec: regionCode is always in scope; flipping the
  // requirement off downgrades status but does not purge the stored value.
  it('retains a stored regionCode value when the requirement flips from yes to no', () => {
    const stored = {
      [regionCodeRequirement.id]: 'no',
      [regionCode.id]: 'FR-75'
    }
    const result = evaluator.evaluate(stored)
    expect(result.fulfilments[regionCode.id]).toBe('FR-75')
    expect(result.obligations[regionCode.id]).toEqual(optional)
  })
})
