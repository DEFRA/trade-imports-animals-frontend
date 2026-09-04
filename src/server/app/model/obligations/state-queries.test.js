import { describe, it, expect } from 'vitest'

import { groupInvariantErrors, leafSatisfied } from './state-queries.js'

// Synthetic obligations — the queries can be exercised in isolation,
// without the parent obligations manifest or evaluator.

const line1Unit1FulfilmentIndex = 'line1.unit1'
const line1Unit2FulfilmentIndex = 'line1.unit2'
const commodityLineFloorErrorCode = 'obligation.commodityLine.atLeastOne'

// Convenience: build a state as the ObligationEvaluator would.
function state({ fulfilments = {}, obligations = {} } = {}) {
  return { fulfilments, obligations }
}

// Minimal implication builder: mimics what ObligationEvaluator returns
// for a given set of in-scope obligations + fulfilments.
function implications(entries) {
  return Object.fromEntries(
    entries.map((entry) => [entry.obligation.id, entry.implication])
  )
}

describe('groupInvariantErrors (V4 requires.anyOf)', () => {
  // Depth-2 fan-out — every unit-record must carry ≥ 1 identifier.
  // Mirrors the shape used by unitRecord.requires in obligations.js.
  const unitRecord = { id: 'unit-group', name: 'unitRecord' }
  const passport = { id: 'passport', name: 'passport' }
  const earTag = { id: 'ear-tag', name: 'earTag' }

  // Group carries the invariant.
  const groupWithRequires = {
    ...unitRecord,
    requires: {
      anyOfIds: [passport.id, earTag.id],
      errorCode: 'obligation.unitRecord.identifiersRequired'
    }
  }

  it('empty list when no group carries `requires`', () => {
    const groupNoRequires = { ...unitRecord }
    const st = state({
      obligations: implications([
        {
          obligation: unitRecord,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupNoRequires, st)).toEqual([])
  })

  it('empty list when the group is out of scope', () => {
    const st = state({
      obligations: implications([
        { obligation: unitRecord, implication: { inScope: false } }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('empty list when no `requires.anyOf` leaf is in scope for this instance', () => {
    // A unit whose commodity code opens NEITHER passport nor earTag
    // has nothing to satisfy; treat as vacuous.
    const st = state({
      obligations: implications([
        {
          obligation: unitRecord,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        { obligation: passport, implication: { inScope: false } },
        { obligation: earTag, implication: { inScope: false } }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('one error per in-scope instance with all required leaves blank', () => {
    const st = state({
      // Two in-scope units on line1; neither has a passport or earTag
      // filled.
      obligations: implications([
        {
          obligation: unitRecord,
          implication: {
            inScope: true,
            fulfilmentIndexes: [
              line1Unit1FulfilmentIndex,
              line1Unit2FulfilmentIndex
            ]
          }
        },
        {
          obligation: passport,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [
              line1Unit1FulfilmentIndex,
              line1Unit2FulfilmentIndex
            ]
          }
        },
        {
          obligation: earTag,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [
              line1Unit1FulfilmentIndex,
              line1Unit2FulfilmentIndex
            ]
          }
        }
      ])
    })
    const errors = groupInvariantErrors(groupWithRequires, st)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toEqual({
      code: 'obligation.unitRecord.identifiersRequired',
      groupId: unitRecord.id,
      groupName: 'unitRecord',
      fulfilmentIndex: line1Unit1FulfilmentIndex
    })
    expect(errors[1].fulfilmentIndex).toBe(line1Unit2FulfilmentIndex)
  })

  it('no error when at least one required leaf is filled', () => {
    const st = state({
      fulfilments: { [passport.id]: { [line1Unit1FulfilmentIndex]: 'PP-001' } },
      obligations: implications([
        {
          obligation: unitRecord,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          obligation: passport,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          obligation: earTag,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toEqual([])
  })

  it('treats an all-blank composite value as unfilled (uses isBlankValue)', () => {
    // A composite address record with all-empty sub-fields must not
    // "satisfy" the invariant.
    const st = state({
      fulfilments: {
        [passport.id]: {
          [line1Unit1FulfilmentIndex]: {
            name: '',
            addressLine1: '',
            town: '',
            postcode: ''
          }
        }
      },
      obligations: implications([
        {
          obligation: unitRecord,
          implication: {
            inScope: true,
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        },
        {
          obligation: passport,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: [line1Unit1FulfilmentIndex]
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithRequires, st)).toHaveLength(1)
  })
})

describe('groupInvariantErrors — `requires.minEntries` collection floor', () => {
  // A group carrying a `minEntries` floor emits one collection-scoped
  // error when fulfilmentIndexes.length is below the floor, so an empty
  // collection is not vacuously satisfied.
  //
  // The floor is orthogonal to `requires.anyOf` (the per-instance rule):
  // a group may carry either, both, or neither. Errors from the two
  // rules coexist in the same list; consumers count them uniformly.
  const commodityLineGroup = { id: 'commodity-line', name: 'commodityLine' }

  const groupWithFloor = {
    ...commodityLineGroup,
    requires: {
      minEntries: 1,
      errorCode: commodityLineFloorErrorCode
    }
  }

  it('emits one collection-scoped MIN_ENTRIES error when fulfilmentIndexes.length is below the floor', () => {
    const st = state({
      obligations: implications([
        {
          obligation: commodityLineGroup,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([
      {
        code: 'MIN_ENTRIES',
        groupId: commodityLineGroup.id,
        groupName: 'commodityLine',
        errorCode: commodityLineFloorErrorCode,
        minEntries: 1,
        actual: 0
      }
    ])
  })

  it('emits no floor error when fulfilmentIndexes.length meets the floor', () => {
    const st = state({
      obligations: implications([
        {
          obligation: commodityLineGroup,
          implication: {
            inScope: true,
            fulfilmentIndexes: ['line1']
          }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('emits no floor error when the group is out of scope', () => {
    // A group whose `applyTo` returns inScope:false is not applicable
    // at all, so the floor doesn't apply either. Symmetric with the
    // `anyOf` early-return.
    const st = state({
      obligations: implications([
        {
          obligation: commodityLineGroup,
          implication: { inScope: false }
        }
      ])
    })
    expect(groupInvariantErrors(groupWithFloor, st)).toEqual([])
  })

  it('composes with `requires.anyOf` — both a floor error and per-instance errors surface', () => {
    // A group carrying both a floor and an anyOf: with fewer
    // fulfilmentIndexes than the floor AND unfilled leaves on each
    // present instance, the two rules must co-emit. Here minEntries=2 but
    // only 1 fulfilmentIndex exists — expect one MIN_ENTRIES error plus
    // one anyOf error on the unfilled instance.
    const leafObl = { id: 'leaf', name: 'leaf' }
    const composite = {
      ...commodityLineGroup,
      requires: {
        minEntries: 2,
        anyOfIds: [leafObl.id],
        errorCode: commodityLineFloorErrorCode
      }
    }
    const st = state({
      obligations: implications([
        {
          obligation: commodityLineGroup,
          implication: {
            inScope: true,
            fulfilmentIndexes: ['line1']
          }
        },
        {
          obligation: leafObl,
          implication: {
            inScope: true,
            status: 'optional',
            fulfilmentIndexes: ['line1']
          }
        }
      ])
    })
    const errors = groupInvariantErrors(composite, st)
    expect(errors).toHaveLength(2)
    expect(errors.some((e) => e.code === 'MIN_ENTRIES')).toBe(true)
    expect(errors.some((e) => e.fulfilmentIndex === 'line1')).toBe(true)
  })
})

describe('#leafSatisfied', () => {
  const leaf = { id: 'passport', name: 'passport' }

  it('returns true when the stored value at the fulfilmentIndex is non-blank', () => {
    const st = state({
      fulfilments: { [leaf.id]: { [line1Unit1FulfilmentIndex]: 'P-1' } }
    })
    expect(leafSatisfied(leaf, line1Unit1FulfilmentIndex, st)).toBe(true)
  })

  it('returns false when the stored value at the fulfilmentIndex is blank', () => {
    const st = state({
      fulfilments: { [leaf.id]: { [line1Unit1FulfilmentIndex]: '' } }
    })
    expect(leafSatisfied(leaf, line1Unit1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the fulfilmentIndex has no stored value', () => {
    const st = state({ fulfilments: { [leaf.id]: {} } })
    expect(leafSatisfied(leaf, line1Unit1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the obligation has no storage entry at all', () => {
    const st = state({ fulfilments: {} })
    expect(leafSatisfied(leaf, line1Unit1FulfilmentIndex, st)).toBe(false)
  })

  it('returns false when the storage entry is an unindexed value (not indexedFulfilments)', () => {
    // Top-level unindexed obligations store a value directly; leafSatisfied
    // is defined only for grouped leaves, so an unindexed storage shape
    // reads as false.
    const scalar = {
      id: 'purposeInInternalMarket',
      name: 'purposeInInternalMarket'
    }
    const st = state({ fulfilments: { [scalar.id]: 'BREEDING' } })
    expect(leafSatisfied(scalar, line1Unit1FulfilmentIndex, st)).toBe(false)
  })
})

describe('groupInvariantErrors — `requires.allOrNothingOfIds` unindexed field-block', () => {
  // A field-block invariant over three sibling unindexed obligations —
  // whichever container the manifest attaches it to. The rule fires once
  // for the whole group when the block is partially filled; it stays
  // silent when the block is fully blank or fully filled.
  const container = { id: 'address-block', name: 'address' }
  const addressLine1Id = 'addressLine1'
  const townId = 'town'
  const postCodeId = 'postCode'
  const errorCode = 'obligation.address.allOrNothing'

  const highStreetAddress = '1 High Street'

  const groupWithBlock = {
    ...container,
    requires: {
      allOrNothingOfIds: [addressLine1Id, townId, postCodeId],
      errorCode
    }
  }

  const inScopeGroupState = (fulfilments) =>
    state({
      fulfilments,
      obligations: implications([
        {
          obligation: container,
          implication: { inScope: true, fulfilmentIndexes: [] }
        }
      ])
    })

  it('emits no error when every member of the block is blank (nothing filled)', () => {
    expect(groupInvariantErrors(groupWithBlock, inScopeGroupState({}))).toEqual(
      []
    )
  })

  it('emits no error when every member of the block is filled (all filled)', () => {
    const st = inScopeGroupState({
      [addressLine1Id]: highStreetAddress,
      [townId]: 'Bristol',
      [postCodeId]: 'BS1 1AA'
    })
    expect(groupInvariantErrors(groupWithBlock, st)).toEqual([])
  })

  it('emits exactly one error naming every missing member id when partially filled', () => {
    // town blank string, postCode missing entirely — both count as blank.
    const st = inScopeGroupState({
      [addressLine1Id]: highStreetAddress,
      [townId]: ''
    })
    expect(groupInvariantErrors(groupWithBlock, st)).toEqual([
      {
        code: errorCode,
        groupId: container.id,
        groupName: container.name,
        missingIds: [townId, postCodeId]
      }
    ])
  })

  it('composes with anyOf on the same group without interfering', () => {
    // A group that has both an anyOfIds rule (unused because no fulfilmentIndexes
    // in scope) and an allOrNothing rule — allOrNothing still fires.
    const combined = {
      ...container,
      requires: {
        allOrNothingOfIds: [addressLine1Id, townId, postCodeId],
        anyOfIds: ['someLeaf'],
        errorCode
      }
    }
    const st = inScopeGroupState({
      [addressLine1Id]: highStreetAddress
    })
    const errors = groupInvariantErrors(combined, st)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe(errorCode)
    expect(errors[0].missingIds).toEqual([townId, postCodeId])
  })
})
