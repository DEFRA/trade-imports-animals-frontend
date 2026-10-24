import { SET_ID } from '../../../../../test/fixtures/index.js'
import { describe, it, expect, beforeAll } from 'vitest'

import { configureObligationSet } from './manifest.js'
import { instanceComplete } from './instance-complete.js'

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
const commodityCode = {
  id: 'commodityCode',
  name: 'commodityCode',
  within: line,
  status: 'mandatory'
}

const line1FulfilmentIndex = 'line1'
const line1Unit1FulfilmentIndex = 'line1.unit1'

const syntheticSet = {
  obligations: [line, unit, passport, earTag, commodityCode],
  groups: [line, unit]
}

const state = ({ fulfilments = {}, obligations = {} } = {}) => ({
  fulfilments,
  obligations
})

const implicationsById = (entries) =>
  Object.fromEntries(entries.map((entry) => [entry.id, entry.implication]))

describe('#instanceComplete', () => {
  beforeAll(() => {
    configureObligationSet(SET_ID, syntheticSet)
  })

  it('reads a fully-populated instance as complete', () => {
    const evaluatedState = state({
      fulfilments: {
        [commodityCode.id]: { [line1FulfilmentIndex]: '0102' },
        [passport.id]: { [line1Unit1FulfilmentIndex]: 'P-1' }
      },
      obligations: implicationsById([
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
          id: commodityCode.id,
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
    expect(
      instanceComplete(unit, line1Unit1FulfilmentIndex, evaluatedState)
    ).toBe(true)
  })

  it('reads an instance missing a mandatory direct-child leaf as incomplete', () => {
    const evaluatedState = state({
      fulfilments: {},
      obligations: implicationsById([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commodityCode.id,
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
    expect(instanceComplete(line, line1FulfilmentIndex, evaluatedState)).toBe(
      false
    )
  })

  it('reads a unit with no identifier stored as incomplete via anyOfIds', () => {
    const evaluatedState = state({
      fulfilments: {
        [commodityCode.id]: { [line1FulfilmentIndex]: '0102' }
      },
      obligations: implicationsById([
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
          id: commodityCode.id,
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
    expect(
      instanceComplete(unit, line1Unit1FulfilmentIndex, evaluatedState)
    ).toBe(false)
  })

  it('reads a not-enumerated instance as vacuously complete', () => {
    const evaluatedState = state({
      fulfilments: {},
      obligations: implicationsById([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commodityCode.id,
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
    expect(instanceComplete(unit, 'line2.unit1', evaluatedState)).toBe(true)
  })

  it('does not block on out-of-scope leaves', () => {
    const evaluatedState = state({
      fulfilments: {},
      obligations: implicationsById([
        {
          id: line.id,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1FulfilmentIndex]
          }
        },
        {
          id: commodityCode.id,
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
    expect(instanceComplete(line, line1FulfilmentIndex, evaluatedState)).toBe(
      true
    )
  })
})
