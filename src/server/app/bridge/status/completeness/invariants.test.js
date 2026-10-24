import { SET_ID } from '../../../sets/live-animals/set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { configureObligationSet } from '../../../model/obligations/manifest.js'
import {
  allowListed,
  equalsGate,
  moreThanOne
} from '../../../model/obligations/helpers/index.js'
import { emptyCollectionSatisfiesFloor } from './invariants.js'

const line = { id: 'line-group', name: 'commodityLines' }

const commodityCode = {
  id: 'commodity-code',
  name: 'commodityCode',
  within: line,
  status: 'mandatory'
}

const allowListedLeaf = {
  id: 'allow-listed-leaf',
  name: 'allowListedLeaf',
  status: 'optional',
  applyTo: allowListed(commodityCode, ['0102'], { id: 'unit-group' })
}

const unreadableGateLeaf = {
  id: 'unreadable-gate-leaf',
  name: 'unreadableGateLeaf',
  status: 'optional',
  applyTo: equalsGate(
    commodityCode,
    '0102',
    { inScope: true },
    { inScope: false }
  )
}

const leafGatedOnOtherGroup = {
  id: 'other-group-leaf',
  name: 'leafGatedOnOtherGroup',
  status: 'optional',
  applyTo: allowListed(commodityCode, ['0102'], { id: 'other-group' })
}

const unitGroupWith = (anyOfIds) => ({
  id: 'unit-group',
  name: 'animalIdentifiers',
  within: line,
  requires: { anyOfIds, errorCode: 'unit.identifierRequired' }
})

const collection = { requiredAtLeastOne: true }

const LINE_1 = 'line1'

const stateWithCommodity = (value) => ({
  fulfilments: { [commodityCode.id]: { [LINE_1]: value } }
})

describe('#emptyCollectionSatisfiesFloor', () => {
  beforeAll(() => {
    configureObligationSet(SET_ID, {
      obligations: [
        commodityCode,
        allowListedLeaf,
        unreadableGateLeaf,
        leafGatedOnOtherGroup
      ],
      groups: [line]
    })
  })

  it('Should report an empty collection satisfied when the collection does not require an entry', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        { requiredAtLeastOne: false },
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('0102')
      )
    ).toBe(true)
  })

  it("Should report an empty collection unsatisfied when an allow-list gate admits the line's commodity code", () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('0102')
      )
    ).toBe(false)
  })

  it("Should report an empty collection satisfied when an allow-list gate does not admit the line's commodity code", () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('01063300')
      )
    ).toBe(true)
  })

  it('Should report an empty collection unsatisfied when the leaf is gated by an equals gate', () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([unreadableGateLeaf.id]),
        LINE_1,
        stateWithCommodity('01063300')
      )
    ).toBe(false)
  })

  it("Should report an empty collection unsatisfied when the leaf's gate is fanned onto a different group", () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([leafGatedOnOtherGroup.id]),
        LINE_1,
        stateWithCommodity('01063300')
      )
    ).toBe(false)
  })

  describe('the floorAppliesToParent gate', () => {
    const gatedGroup = (gate) => ({
      ...unitGroupWith([allowListedLeaf.id]),
      requires: {
        anyOfIds: [allowListedLeaf.id],
        errorCode: 'unit.identifierRequired',
        floorAppliesToParent: gate
      }
    })

    const twoLines = {
      fulfilments: {
        [commodityCode.id]: { line1: '0102', line2: '0102' }
      }
    }

    it('Should report an empty collection satisfied when the gate admits only one entry', () => {
      expect(
        emptyCollectionSatisfiesFloor(
          collection,
          gatedGroup(moreThanOne(allowListed(commodityCode, ['0102'], null))),
          LINE_1,
          stateWithCommodity('0102')
        )
      ).toBe(true)
    })

    it('Should report an empty collection satisfied for a parent the in-scope gate does not name', () => {
      expect(
        emptyCollectionSatisfiesFloor(
          collection,
          gatedGroup(moreThanOne(allowListed(commodityCode, ['0101'], null))),
          LINE_1,
          {
            fulfilments: {
              [commodityCode.id]: {
                line1: '0102',
                line2: '0101',
                line3: '0101'
              }
            }
          }
        )
      ).toBe(true)
    })

    it('Should report an empty collection unsatisfied for a parent the gate names', () => {
      expect(
        emptyCollectionSatisfiesFloor(
          collection,
          gatedGroup(moreThanOne(allowListed(commodityCode, ['0102'], null))),
          LINE_1,
          twoLines
        )
      ).toBe(false)
    })

    it('Should report an empty collection satisfied when the gate is out of scope altogether', () => {
      expect(
        emptyCollectionSatisfiesFloor(
          collection,
          gatedGroup(allowListed(commodityCode, ['0101'], null)),
          LINE_1,
          stateWithCommodity('0102')
        )
      ).toBe(true)
    })
  })
})
