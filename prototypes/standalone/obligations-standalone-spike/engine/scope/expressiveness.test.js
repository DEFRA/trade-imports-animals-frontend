import { describe, it, expect } from 'vitest'
import { createScopeRegistry } from './registry.js'
import { journeyScopeRegistry } from './journey-rules.js'
import * as demos from './expressiveness.js'
import { evaluateObligations } from '../evaluate.js'

/**
 * Graft 5 — the expressiveness claims proven at unit level, through the
 * real evaluator, over a deliberately NON-car-insurance fixture model (the
 * generality rail, OPEN1-X2_1). External state arrives via the injected
 * in-memory fixture, exactly as the orchestrator would supply it.
 */
const fixture = [
  {
    id: 'ob-address',
    name: 'addressHistory',
    type: 'address',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  },
  { id: 'ob-gap', name: 'gapExplanation', type: 'text', cardinality: 'single' },
  {
    id: 'ob-overseas',
    name: 'overseasChecks',
    type: 'text',
    cardinality: 'single'
  },
  {
    id: 'ob-mod-cost',
    name: 'modCost',
    type: 'currency',
    cardinality: 'indexed',
    indexedBy: { source: 'user', mutability: 'edit-add-remove' }
  },
  {
    id: 'ob-fitted',
    name: 'professionallyFitted',
    type: 'boolean',
    cardinality: 'single'
  },
  { id: 'ob-fraud', name: 'fraudReview', type: 'text', cardinality: 'single' },
  {
    id: 'ob-credit',
    name: 'creditCheck',
    type: 'lookup-result',
    cardinality: 'single'
  },
  {
    id: 'ob-income',
    name: 'declaredIncome',
    type: 'number',
    cardinality: 'single'
  },
  { id: 'ob-proof', name: 'incomeProof', type: 'file', cardinality: 'single' }
]

// evaluate() needs a companion-free path — the fixture uses types outside
// the journey registry deliberately: the evaluator is model-parameterised.
const TODAY = '2026-07-02'

const registry = createScopeRegistry()
registry.register(
  'gapExplanation',
  'addressGapInLastFiveYears',
  demos.intervalsLeaveGap('addressHistory', 5, TODAY)
)
registry.register(
  'overseasChecks',
  'anyNonUkAddress',
  demos.anyFulfilmentMatches(
    'addressHistory',
    (value) => value?.country !== 'UK'
  )
)
registry.register(
  'professionallyFitted',
  'anyModCostOver500',
  demos.anyValueOver('modCost', 500)
)
registry.register(
  'fraudReview',
  'fraudFlagRaised',
  demos.externalFlagIsSet('fraudFlag')
)
registry.register(
  'creditCheck',
  'lookupUnresolved',
  demos.lookupUnresolved('creditCheck')
)
registry.register(
  'incomeProof',
  'incomeAtLeast100k',
  demos.mandatoryWhenAtLeast('declaredIncome', 100000)
)

const evaluate = (fulfilments, externalState = {}) =>
  evaluateObligations(fixture, fulfilments, {
    scopeRegistry: registry,
    externalState
  })

const entry = (evaluation, id) => evaluation.obligations[id]

describe('engine/scope/expressiveness — demo predicates through the evaluator', () => {
  it('interval algebra: a gap in five-year address coverage mandates an explanation', () => {
    const gappy = evaluate({
      'ob-address': {
        a1: { value: { from: '2024-01-01', to: null, country: 'UK' } }
      }
    })
    expect(entry(gappy, 'ob-gap')).toMatchObject({
      inScope: true,
      status: 'mandatory'
    })

    const covered = evaluate({
      'ob-address': {
        a1: { value: { from: '2019-05-01', to: '2024-01-01', country: 'UK' } },
        a2: { value: { from: '2024-01-01', to: null, country: 'UK' } }
      }
    })
    expect(entry(covered, 'ob-gap').inScope).toBe(false)
  })

  it('quantifier: any non-UK address brings overseas checks into scope', () => {
    const abroad = evaluate({
      'ob-address': {
        a1: { value: { from: '2020-01-01', to: null, country: 'FR' } }
      }
    })
    expect(entry(abroad, 'ob-overseas').status).toBe('mandatory')
    const home = evaluate({
      'ob-address': {
        a1: { value: { from: '2020-01-01', to: null, country: 'UK' } }
      }
    })
    expect(entry(home, 'ob-overseas').inScope).toBe(false)
  })

  it('within-fulfilment activation: any cost over £500 mandates professional fitting', () => {
    const pricey = evaluate({
      'ob-mod-cost': { turbo: { value: 800 }, alloys: { value: 200 } }
    })
    expect(entry(pricey, 'ob-fitted').status).toBe('mandatory')
    const cheap = evaluate({ 'ob-mod-cost': { alloys: { value: 200 } } })
    expect(entry(cheap, 'ob-fitted').inScope).toBe(false)
  })

  it('external state: the injected fraud flag scopes a review obligation', () => {
    expect(entry(evaluate({}, { fraudFlag: true }), 'ob-fraud').status).toBe(
      'mandatory'
    )
    expect(entry(evaluate({}, {}), 'ob-fraud').inScope).toBe(false)
  })

  it('failed lookup is just an unsatisfied obligation: stays mandatory until ok', () => {
    expect(entry(evaluate({}), 'ob-credit').status).toBe('mandatory')
    const failed = evaluate({ 'ob-credit': { value: { ok: false } } })
    expect(entry(failed, 'ob-credit').status).toBe('mandatory')
    const resolved = evaluate({
      'ob-credit': { value: { ok: true, score: 720 } }
    })
    expect(entry(resolved, 'ob-credit').inScope).toBe(false)
  })

  it('mandate flip: status moves with later fulfilments, data preserved in scope', () => {
    const low = evaluate({
      'ob-income': { value: 50000 },
      'ob-proof': { value: 'payslips.pdf' }
    })
    expect(entry(low, 'ob-proof')).toMatchObject({
      inScope: true,
      status: 'optional',
      fulfilled: true
    })
    const high = evaluate({
      'ob-income': { value: 150000 },
      'ob-proof': { value: 'payslips.pdf' }
    })
    expect(entry(high, 'ob-proof')).toMatchObject({
      inScope: true,
      status: 'mandatory',
      fulfilled: true
    })
    expect(high.fulfilments['ob-proof']).toEqual({ value: 'payslips.pdf' })
  })

  it('never registers a demo against a journey obligation', () => {
    const journeyNames = new Set(journeyScopeRegistry.obligationNames())
    for (const record of fixture) {
      expect(journeyNames.has(record.name)).toBe(false)
    }
  })
})
