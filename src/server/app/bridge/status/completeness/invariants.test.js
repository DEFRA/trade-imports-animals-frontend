import { SET_ID } from '../../../sets/live-animals/set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { INDEX_DELIMITER } from '../../fulfilment-id.js'
import { configureObligationSet } from '../../../model/obligations/manifest.js'
import {
  allowListed,
  allowListedPairs,
  equalsGate,
  moreThanOne
} from '../../../model/obligations/helpers/index.js'
import {
  emptyCollectionSatisfiesFloor,
  emptyCollectionShortOfFloor
} from './invariants.js'

const line = { id: 'line-group', name: 'commodityLines' }

const commodityCode = {
  id: 'commodity-code',
  name: 'commodityCode',
  within: line,
  status: 'mandatory'
}

const UNIT_GROUP_ID = 'unit-group'

const allowListedLeaf = {
  id: 'allow-listed-leaf',
  name: 'allowListedLeaf',
  status: 'optional',
  applyTo: allowListed(commodityCode, ['0102'], { id: UNIT_GROUP_ID })
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

const speciesLatinName = {
  id: 'species-latin-name',
  name: 'speciesLatinName',
  within: line,
  status: 'mandatory'
}

const pairGatedLeaf = {
  id: 'pair-gated-leaf',
  name: 'pairGatedLeaf',
  status: 'optional',
  applyTo: allowListedPairs(
    commodityCode,
    speciesLatinName,
    [['0101', 'Equus cabalus']],
    { id: UNIT_GROUP_ID }
  )
}

const unitGroupWith = (anyOfIds) => ({
  id: UNIT_GROUP_ID,
  name: 'animalIdentifiers',
  within: line,
  requires: { anyOfIds, errorCode: 'unit.identifierRequired' }
})

const collection = { requiredAtLeastOne: true }

const LINE_1 = 'line1'

const stateWithCommodity = (value) => ({
  fulfilments: { [commodityCode.id]: { [LINE_1]: value } }
})

const stateWithCommodityAndSpecies = (code, species) => ({
  fulfilments: {
    [commodityCode.id]: { [LINE_1]: code },
    [speciesLatinName.id]: { [LINE_1]: species }
  }
})

describe('#emptyCollectionSatisfiesFloor', () => {
  beforeAll(() => {
    configureObligationSet(SET_ID, {
      obligations: [
        commodityCode,
        allowListedLeaf,
        unreadableGateLeaf,
        leafGatedOnOtherGroup,
        speciesLatinName,
        pairGatedLeaf
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

  it("Should report an empty collection unsatisfied when a pair gate admits the line's commodity code and species", () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([pairGatedLeaf.id]),
        LINE_1,
        stateWithCommodityAndSpecies('0101', 'Equus cabalus')
      )
    ).toBe(false)
  })

  it("Should report an empty collection satisfied when a pair gate does not admit the line's species", () => {
    expect(
      emptyCollectionSatisfiesFloor(
        collection,
        unitGroupWith([pairGatedLeaf.id]),
        LINE_1,
        stateWithCommodityAndSpecies('0101', 'Equus asinus')
      )
    ).toBe(true)
  })

  it('Should report an empty collection short of its floor when the floor asks the parent for a record', () => {
    expect(
      emptyCollectionShortOfFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('0102')
      )
    ).toBe(true)
  })

  it('Should not report an empty collection short of its floor when the floor does not ask the parent for a record', () => {
    expect(
      emptyCollectionShortOfFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        stateWithCommodity('01063300')
      )
    ).toBe(false)
  })

  it('Should not report a collection short of its floor once it holds a record', () => {
    expect(
      emptyCollectionShortOfFloor(
        collection,
        unitGroupWith([allowListedLeaf.id]),
        LINE_1,
        {
          ...stateWithCommodity('0102'),
          obligations: {
            [UNIT_GROUP_ID]: {
              fulfilmentIndexes: [`${LINE_1}${INDEX_DELIMITER}0`]
            }
          }
        }
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

    it('Should report an empty collection satisfied when moreThanOne sees only one matching line', () => {
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
