import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { configureObligationSet } from './manifest.js'
import { instanceComplete } from './instance-complete.js'

// Synthetic manifest — mirrors the shape of a two-level nested collection
// with per-instance invariants, so instanceComplete can be exercised
// without pulling in the live-animals set.

const line = { id: 'line-group', name: 'commodityLines' }
const unit = {
  id: 'unit-group',
  name: 'animalIdentifiers',
  within: line,
  requires: {
    anyOfIds: ['passport', 'earTag'],
    errorCode: 'unit.identifierRequired'
  }
}
const passport = {
  id: 'passport',
  name: 'passport',
  within: unit,
  status: 'optional'
}
const earTag = {
  id: 'earTag',
  name: 'earTag',
  within: unit,
  status: 'optional'
}
const commoditySelection = {
  id: 'commoditySelection',
  name: 'commoditySelection',
  within: line,
  status: 'mandatory'
}

const line1FulfilmentIndex = 'line1'
const line1Unit1FulfilmentIndex = 'line1.unit1'

const syntheticSet = {
  obligations: [line, unit, passport, earTag, commoditySelection],
  groups: [line, unit]
}

const state = ({ fulfilments = {}, obligations = {} } = {}) => ({
  fulfilments,
  obligations
})

const impls = (entries) =>
  Object.fromEntries(entries.map((entry) => [entry.id, entry.implication]))

describe('#instanceComplete', () => {
  beforeAll(() => {
    configureObligationSet(syntheticSet)
  })

  afterAll(() => {
    // Vitest workers isolate module state per test file, so leaving the
    // configured set doesn't leak. Reset defensively anyway.
    configureObligationSet(undefined)
  })

  it('reads a fully-populated instance as complete', () => {
    const st = state({
      fulfilments: {
        [commoditySelection.id]: { [line1FulfilmentIndex]: 'Cow' },
        [passport.id]: { [line1Unit1FulfilmentIndex]: 'P-1' }
      },
      obligations: impls([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: unit.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          id: commoditySelection.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: passport.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        { id: earTag.id, implication: { inScope: true, fulfilmentIndexes: [] } }
      ])
    })
    expect(instanceComplete(unit, line1Unit1FulfilmentIndex, st)).toBe(true)
  })

  it('reads an instance missing a mandatory direct-child leaf as incomplete', () => {
    // commoditySelection is a mandatory direct child of line but has no
    // fulfilmentIndex for line1 — the direct-child requirement fires.
    const st = state({
      fulfilments: {},
      obligations: impls([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commoditySelection.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        { id: unit.id, implication: { inScope: true, fulfilmentIndexes: [] } },
        {
          id: passport.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        { id: earTag.id, implication: { inScope: true, fulfilmentIndexes: [] } }
      ])
    })
    expect(instanceComplete(line, line1FulfilmentIndex, st)).toBe(false)
  })

  it('reads a unit with no identifier stored as incomplete via anyOfIds', () => {
    const st = state({
      fulfilments: {
        [commoditySelection.id]: { [line1FulfilmentIndex]: 'Cow' }
      },
      obligations: impls([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: unit.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          id: commoditySelection.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: passport.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          id: earTag.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        }
      ])
    })
    expect(instanceComplete(unit, line1Unit1FulfilmentIndex, st)).toBe(false)
  })

  it('reads a not-enumerated instance as vacuously complete', () => {
    // No fulfilmentIndexes anywhere for line2.unit1 — outside the enumerated set. No
    // direct-child mandatory leaves under unit either, so nothing blocks.
    const st = state({
      fulfilments: {},
      obligations: impls([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commoditySelection.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        { id: unit.id, implication: { inScope: true, fulfilmentIndexes: [] } },
        {
          id: passport.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        { id: earTag.id, implication: { inScope: true, fulfilmentIndexes: [] } }
      ])
    })
    expect(instanceComplete(unit, 'line2.unit1', st)).toBe(true)
  })

  it('does not block on out-of-scope leaves', () => {
    // commoditySelection is out of scope — the direct-child requirement is
    // gated behind inScope, so the missing fulfilmentIndex is ignored.
    const st = state({
      fulfilments: {},
      obligations: impls([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commoditySelection.id,
          implication: { inScope: false, fulfilmentIndexes: [] }
        },
        { id: unit.id, implication: { inScope: true, fulfilmentIndexes: [] } },
        {
          id: passport.id,
          implication: { inScope: true, fulfilmentIndexes: [] }
        },
        { id: earTag.id, implication: { inScope: true, fulfilmentIndexes: [] } }
      ])
    })
    expect(instanceComplete(line, line1FulfilmentIndex, st)).toBe(true)
  })
})
