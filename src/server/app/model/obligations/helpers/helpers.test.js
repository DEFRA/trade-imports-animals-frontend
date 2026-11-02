import { describe, it, expect } from 'vitest'
import {
  allowListed,
  allowListedPairs,
  alwaysInScope,
  anyAllowListed,
  anyNotInUnionOf,
  branchedGate,
  equalsGate,
  includesGate,
  matches,
  moreThanOne,
  notInUnionOf,
  obligationMetadata,
  present,
  presentGate
} from './index.js'
import { isNonArrayObject, readGate } from '../helper-internals.js'

const codeObl = { id: 'code-obl' }
const boolObl = { id: 'bool-obl' }
const groupObl = { id: 'group-obl' }

const line1Unit1Path = 'line1.unit1'
const line1Unit2Path = 'line1.unit2'

const undefinedValueEntry = (key) => Object.fromEntries([[key, undefined]])

describe('allowListed', () => {
  it('Should return inScope: false when no stored keys pass the allowlist', () => {
    const gate = allowListed(codeObl, ['a', 'b'])
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'y' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('Should return fulfilmentIndexes at gate level when no gatedParentGroup', () => {
    const gate = allowListed(codeObl, ['a', 'b'])
    const decision = gate(
      { [codeObl.id]: { k1: 'a', k2: 'x', k3: 'b' } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, fulfilmentIndexes: ['k1', 'k3'] })
  })

  it('Should project to group instance-paths when a gatedParentGroup is supplied', () => {
    const gate = allowListed(codeObl, ['a'], groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'a', line2: 'x' } }
    const ids = new Map([
      [groupObl.id, [line1Unit1Path, line1Unit2Path, 'line2.unit1']]
    ])
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({
      inScope: true,
      fulfilmentIndexes: [line1Unit1Path, line1Unit2Path]
    })
  })

  it('Should return an empty fulfilmentIndexes list when the group has no instances yet', () => {
    const gate = allowListed(codeObl, ['a'], groupObl)
    const fulfilments = { [codeObl.id]: { line1: 'a' } }
    const ids = new Map()
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({ inScope: false })
  })

  it('Should expose metadata for introspection', () => {
    const gate = allowListed(codeObl, ['a', 'b'], groupObl)
    expect(gate.metadata).toEqual({
      gateType: 'allowListed',
      obligationId: codeObl.id,
      values: ['a', 'b'],
      gatedParentGroupId: groupObl.id,
      reasons: null
    })
  })

  it('Should merge reasons into the decision when in scope', () => {
    const reason = { code: 'x.applicable', explanation: 'because x' }
    const gate = allowListed(codeObl, ['a'], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'a' } }, new Map())
    expect(decision).toEqual({
      inScope: true,
      fulfilmentIndexes: ['k1'],
      reasons: [reason]
    })
  })

  it('Should not attach reasons to out-of-scope decisions', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = allowListed(codeObl, ['a'], null, [reason])
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })
})

describe('allowListedPairs', () => {
  const speciesObl = { id: 'species-obl' }

  it('Should admit only the fulfilmentIndexes whose two values form a listed pair', () => {
    const gate = allowListedPairs(codeObl, speciesObl, [['a', 'cat']])
    const decision = gate(
      {
        [codeObl.id]: { k1: 'a', k2: 'b', k3: 'a' },
        [speciesObl.id]: { k1: 'cat', k2: 'cat', k3: 'dog' }
      },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, fulfilmentIndexes: ['k1'] })
  })

  it('Should project a listed pair onto the instance-paths of its line', () => {
    const gate = allowListedPairs(codeObl, speciesObl, [['a', 'cat']], groupObl)
    const decision = gate(
      {
        [codeObl.id]: { line1: 'a', line2: 'a' },
        [speciesObl.id]: { line1: 'cat', line2: 'dog' }
      },
      new Map([[groupObl.id, [line1Unit1Path, line1Unit2Path, 'line2.unit2']]])
    )
    expect(decision).toEqual({
      inScope: true,
      fulfilmentIndexes: [line1Unit1Path, line1Unit2Path]
    })
  })

  it('Should expose both gate obligations and the pairs for introspection', () => {
    const gate = allowListedPairs(codeObl, speciesObl, [['a', 'cat']], groupObl)
    expect(gate.metadata).toEqual({
      gateType: 'allowListedPairs',
      obligationId: codeObl.id,
      pairedObligationId: speciesObl.id,
      values: [['a', 'cat']],
      gatedParentGroupId: groupObl.id,
      reasons: null
    })
    expect(obligationMetadata({ applyTo: gate }).dependsOn).toEqual([
      codeObl.id,
      speciesObl.id
    ])
  })
})

describe('notInUnionOf', () => {
  const firstAllowlist = ['a', 'b']
  const secondAllowlist = ['c', 'd']

  it('Should return inScope: false when every stored key IS in the union', () => {
    const gate = notInUnionOf(codeObl, [firstAllowlist, secondAllowlist])
    const decision = gate({ [codeObl.id]: { k1: 'a', k2: 'c' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('Should return fulfilmentIndexes at gate level for keys whose value is NOT in the union', () => {
    const gate = notInUnionOf(codeObl, [firstAllowlist, secondAllowlist])
    const decision = gate(
      { [codeObl.id]: { k1: 'a', k2: 'z', k3: 'c', k4: 'q' } },
      new Map()
    )
    expect(decision).toEqual({ inScope: true, fulfilmentIndexes: ['k2', 'k4'] })
  })

  it('Should project to group instance-paths when a gatedParentGroup is supplied', () => {
    const gate = notInUnionOf(
      codeObl,
      [firstAllowlist, secondAllowlist],
      groupObl
    )
    const fulfilments = { [codeObl.id]: { line1: 'z', line2: 'a' } }
    const ids = new Map([
      [groupObl.id, [line1Unit1Path, line1Unit2Path, 'line2.unit1']]
    ])
    const decision = gate(fulfilments, ids)
    expect(decision).toEqual({
      inScope: true,
      fulfilmentIndexes: [line1Unit1Path, line1Unit2Path]
    })
  })

  it('Should expose metadata.values as the union of the input allowlists (derived at helper-invocation time)', () => {
    const gate = notInUnionOf(
      codeObl,
      [firstAllowlist, secondAllowlist],
      groupObl,
      null
    )
    expect(gate.metadata).toEqual({
      gateType: 'notInUnionOf',
      obligationId: codeObl.id,
      values: ['a', 'b', 'c', 'd'],
      gatedParentGroupId: groupObl.id,
      reasons: null
    })
  })

  it('Should de-duplicate metadata.values across overlapping input allowlists', () => {
    const gate = notInUnionOf(codeObl, [
      ['0101', '0102'],
      ['0102', '0103']
    ])
    expect(gate.metadata.values).toEqual(['0101', '0102', '0103'])
  })

  it('Should merge reasons into the decision when in scope', () => {
    const reason = { code: 'x.applicable', explanation: 'because x' }
    const gate = notInUnionOf(
      codeObl,
      [firstAllowlist, secondAllowlist],
      null,
      [reason]
    )
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({
      inScope: true,
      fulfilmentIndexes: ['k1'],
      reasons: [reason]
    })
  })

  it('Should not attach reasons to out-of-scope decisions', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = notInUnionOf(
      codeObl,
      [firstAllowlist, secondAllowlist],
      null,
      [reason]
    )
    const decision = gate({ [codeObl.id]: { k1: 'a' } }, new Map())
    expect(decision).toEqual({ inScope: false })
  })

  it('Should accept a flat list of values too (single-allowlist complement)', () => {
    const gate = notInUnionOf(codeObl, ['a', 'b'])
    expect(gate.metadata.values).toEqual(['a', 'b'])
    const decision = gate({ [codeObl.id]: { k1: 'z' } }, new Map())
    expect(decision).toEqual({ inScope: true, fulfilmentIndexes: ['k1'] })
  })
})

describe('anyAllowListed', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: false }

  it('Should return whenTrue when any stored value is in the allowlist', () => {
    const gate = anyAllowListed(codeObl, ['a', 'b'], whenTrue, whenFalse)
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'a', k3: 'y' } })
    expect(decision).toEqual(whenTrue)
  })

  it('Should return whenFalse when no stored value is in the allowlist', () => {
    const gate = anyAllowListed(codeObl, ['a'], whenTrue, whenFalse)
    const decision = gate({ [codeObl.id]: { k1: 'x', k2: 'y' } })
    expect(decision).toEqual(whenFalse)
  })

  it('Should return whenFalse when nothing is stored at all', () => {
    const gate = anyAllowListed(codeObl, ['a'], whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('Should return whenTrue for a single stored value in the allowlist and whenFalse for one outside it', () => {
    const gate = anyAllowListed(codeObl, ['yes'], whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: 'yes' })).toEqual(whenTrue)
    expect(gate({ [codeObl.id]: 'no' })).toEqual(whenFalse)
  })
})

describe('anyNotInUnionOf', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: false }
  const exempt = ['0101', '01061900']

  it('Should return whenTrue when any stored value is outside the union', () => {
    const gate = anyNotInUnionOf(codeObl, exempt, whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: { k1: '0101', k2: '0103' } })).toEqual(whenTrue)
  })

  it('Should return whenFalse when every stored value is in the union', () => {
    const gate = anyNotInUnionOf(codeObl, exempt, whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: { k1: '0101', k2: '01061900' } })).toEqual(
      whenFalse
    )
  })

  it('Should return whenFalse when nothing is stored at all', () => {
    const gate = anyNotInUnionOf(codeObl, exempt, whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('Should ignore a line with no value yet', () => {
    const gate = anyNotInUnionOf(codeObl, exempt, whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: { k1: '0101', k2: null, k3: '' } })).toEqual(
      whenFalse
    )
  })

  it('Should return whenTrue for a single stored value outside the union and whenFalse for one inside it', () => {
    const gate = anyNotInUnionOf(codeObl, exempt, whenTrue, whenFalse)
    expect(gate({ [codeObl.id]: '0102' })).toEqual(whenTrue)
    expect(gate({ [codeObl.id]: '0101' })).toEqual(whenFalse)
  })

  it('Should expose the derived union of several lists on its metadata', () => {
    const gate = anyNotInUnionOf(
      codeObl,
      () => [['0101'], ['01061900', '0101']],
      whenTrue,
      whenFalse
    )
    expect(gate.metadata).toMatchObject({
      gateType: 'anyNotInUnionOf',
      obligationId: codeObl.id,
      values: ['0101', '01061900']
    })
  })
})

describe('branchedGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('Should return whenTrue when the predicate is true', () => {
    const gate = branchedGate(() => true, whenTrue, whenFalse)
    expect(gate({}, new Map())).toEqual(whenTrue)
  })

  it('Should return whenFalse when the predicate is false', () => {
    const gate = branchedGate(() => false, whenTrue, whenFalse)
    expect(gate({}, new Map())).toEqual(whenFalse)
  })

  it('Should thread fulfilments and ids into the predicate', () => {
    let seen = null
    const gate = branchedGate(
      (fulfilments, ids) => {
        seen = { fulfilments, ids }
        return false
      },
      whenTrue,
      whenFalse
    )
    const fulfilments = { any: 'thing' }
    const ids = new Map([['k', ['v']]])
    gate(fulfilments, ids)
    expect(seen).toEqual({ fulfilments, ids })
  })
})

describe('matches', () => {
  it('Should return inScope: true when the stored value matches', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({ [boolObl.id]: 'yes' })).toEqual({ inScope: true })
  })

  it('Should return inScope: false when the stored value differs', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({ [boolObl.id]: 'no' })).toEqual({ inScope: false })
  })

  it('Should return inScope: false when nothing is stored', () => {
    const gate = matches(boolObl, 'yes')
    expect(gate({})).toEqual({ inScope: false })
  })
})

describe('present', () => {
  it('Should return true when an unindexed value is stored', () => {
    expect(present(boolObl)({ [boolObl.id]: 'anything' })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: 0 })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: false })).toBe(true)
    expect(present(boolObl)({ [boolObl.id]: '' })).toBe(true)
  })

  it('Should return false when nothing is stored', () => {
    expect(present(boolObl)({})).toBe(false)
    expect(present(boolObl)(undefinedValueEntry(boolObl.id))).toBe(false)
    expect(present(boolObl)({ [boolObl.id]: null })).toBe(false)
  })

  it('Should return true for indexed obligations with at least one key', () => {
    expect(present(groupObl)({ [groupObl.id]: { k1: 'v' } })).toBe(true)
  })

  it('Should return false for indexed obligations with no keys', () => {
    expect(present(groupObl)({ [groupObl.id]: {} })).toBe(false)
  })
})

describe('obligationMetadata', () => {
  it('Should surface an explicit dependsOn verbatim', () => {
    const obligation = {
      id: 'x-id',
      name: 'x',
      applyTo: (f) =>
        f['A'] === 'yes' ? { inScope: true } : { inScope: false },
      dependsOn: ['A', 'B']
    }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toEqual(['A', 'B'])
  })

  it('Should return dependsOn: undefined when the obligation omits the key', () => {
    const obligation = {
      id: 'y-id',
      name: 'y',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toBeUndefined()
  })

  it('Should merge the gate helper sidecar (gate shape) with dependsOn', () => {
    const gateObl = { id: 'gate-id' }
    const obligation = {
      id: 'z-id',
      name: 'z',
      applyTo: allowListed(gateObl, ['a']),
      dependsOn: [gateObl.id]
    }
    const meta = obligationMetadata(obligation)
    expect(meta.gateType).toBe('allowListed')
    expect(meta.obligationId).toBe(gateObl.id)
    expect(meta.dependsOn).toEqual([gateObl.id])
  })

  it('Should return dependsOn: undefined for an obligation with no applyTo', () => {
    const obligation = { id: 'g-id', name: 'g' }
    const meta = obligationMetadata(obligation)
    expect(meta.dependsOn).toBeUndefined()
  })
})

describe('equalsGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('Should return whenTrue when the stored value equals the target', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'yes' })).toEqual(whenTrue)
  })

  it('Should return whenFalse when the stored value differs', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'no' })).toEqual(whenFalse)
  })

  it('Should return whenFalse when nothing is stored', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('Should pass the caller-supplied decision objects through verbatim — regionCode shape', () => {
    const reason = { code: 'r.applicable', explanation: 'r' }
    const gate = equalsGate(
      boolObl,
      'yes',
      { inScope: true, status: 'mandatory', reasons: [reason] },
      { inScope: true, status: 'optional' }
    )
    expect(gate({ [boolObl.id]: 'yes' })).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [reason]
    })
    expect(gate({ [boolObl.id]: 'no' })).toEqual({
      inScope: true,
      status: 'optional'
    })
  })

  it('Should expose metadata with obligationId + value + branches', () => {
    const gate = equalsGate(boolObl, 'yes', whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      gateType: 'equalsGate',
      obligationId: boolObl.id,
      value: 'yes',
      whenTrue,
      whenFalse
    })
  })
})

describe('presentGate', () => {
  const whenTrue = { inScope: true, status: 'mandatory' }
  const whenFalse = { inScope: true, status: 'optional' }

  it('Should return whenTrue when the gate has any unindexed value', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'anything' })).toEqual(whenTrue)
  })

  it('Should return whenTrue for truthy-but-falsy values (0, false, "")', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 0 })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: false })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: '' })).toEqual(whenTrue)
  })

  it('Should return whenFalse when the gate is undefined / null', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
    expect(gate(undefinedValueEntry(boolObl.id))).toEqual(whenFalse)
    expect(gate({ [boolObl.id]: null })).toEqual(whenFalse)
  })

  it('Should return whenTrue for indexed obligations with at least one key', () => {
    const gate = presentGate(groupObl, whenTrue, whenFalse)
    expect(gate({ [groupObl.id]: { k1: 'v' } })).toEqual(whenTrue)
  })

  it('Should return whenFalse for indexed obligations with no keys', () => {
    const gate = presentGate(groupObl, whenTrue, whenFalse)
    expect(gate({ [groupObl.id]: {} })).toEqual(whenFalse)
  })

  it('Should expose metadata with obligationId + branches (no value)', () => {
    const gate = presentGate(boolObl, whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      gateType: 'presentGate',
      obligationId: boolObl.id,
      whenTrue,
      whenFalse
    })
  })
})

describe('includesGate', () => {
  const whenTrue = { inScope: true, status: 'optional' }
  const whenFalse = { inScope: false }
  const LAND_MODES = ['railway', 'road-vehicle']

  it('Should return whenTrue when the stored value is in the list', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'railway' })).toEqual(whenTrue)
    expect(gate({ [boolObl.id]: 'road-vehicle' })).toEqual(whenTrue)
  })

  it('Should return whenFalse when the stored value is not in the list', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({ [boolObl.id]: 'sea' })).toEqual(whenFalse)
  })

  it('Should return whenFalse when nothing is stored', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate({})).toEqual(whenFalse)
  })

  it('Should expose metadata with obligationId + values + branches', () => {
    const gate = includesGate(boolObl, LAND_MODES, whenTrue, whenFalse)
    expect(gate.metadata).toEqual({
      gateType: 'includesGate',
      obligationId: boolObl.id,
      values: LAND_MODES,
      whenTrue,
      whenFalse
    })
  })
})

describe('alwaysInScope', () => {
  it('Should return a fixed decision with the given status', () => {
    const gate = alwaysInScope('mandatory')
    expect(gate({})).toEqual({ inScope: true, status: 'mandatory' })
    expect(gate({ any: 'thing' })).toEqual({
      inScope: true,
      status: 'mandatory'
    })
  })

  it('Should attach reasons when provided', () => {
    const reason = { code: 'x', explanation: 'y' }
    const gate = alwaysInScope('mandatory', [reason])
    expect(gate({})).toEqual({
      inScope: true,
      status: 'mandatory',
      reasons: [reason]
    })
  })

  it('Should support optional status too', () => {
    const gate = alwaysInScope('optional')
    expect(gate({})).toEqual({ inScope: true, status: 'optional' })
  })

  it('Should expose metadata with status (+ optional reasons)', () => {
    const gate = alwaysInScope('mandatory')
    expect(gate.metadata).toEqual({
      gateType: 'alwaysInScope',
      status: 'mandatory',
      reasons: null
    })
    const gateWithReasons = alwaysInScope('mandatory', [
      { code: 'x', explanation: 'y' }
    ])
    expect(gateWithReasons.metadata).toEqual({
      gateType: 'alwaysInScope',
      status: 'mandatory',
      reasons: [{ code: 'x', explanation: 'y' }]
    })
  })
})

describe('moreThanOne', () => {
  const inner = allowListed(codeObl, ['0102'], null)

  it('Should hand back the inner decision where it admits more than one entry', () => {
    const gate = moreThanOne(inner)
    expect(gate({ [codeObl.id]: { line1: '0102', line2: '0102' } })).toEqual({
      inScope: true,
      fulfilmentIndexes: ['line1', 'line2']
    })
  })

  it('Should stand the inner gate down on a single admitted entry', () => {
    const gate = moreThanOne(inner)
    expect(
      gate({ [codeObl.id]: { line1: '0102', line2: '01063300' } })
    ).toEqual({
      inScope: false
    })
  })

  it('Should stay out of scope where the inner gate admits nothing', () => {
    const gate = moreThanOne(inner)
    expect(gate({ [codeObl.id]: { line1: '01063300' } })).toEqual({
      inScope: false
    })
  })

  it('Should stay out of scope for an inner decision naming no entries', () => {
    const gate = moreThanOne(() => ({ inScope: true }))
    expect(gate({})).toEqual({ inScope: false })
  })

  it('Should expose combinator metadata carrying the wrapped gate', () => {
    const gate = moreThanOne(inner)
    expect(gate.metadata.gateType).toBeUndefined()
    expect(gate.metadata.combinator).toBe('moreThanOne')
    expect(gate.metadata.inner.gateType).toBe('allowListed')
    expect(gate.metadata.inner.obligationId).toBe(codeObl.id)
  })

  it('Should derive no dependsOn of its own', () => {
    expect(
      obligationMetadata({ applyTo: moreThanOne(inner) }).dependsOn
    ).toBeUndefined()
  })
})

describe('isNonArrayObject', () => {
  it('Should return true for a plain indexedFulfilments object', () => {
    expect(isNonArrayObject({ line1: 'a', line2: 'b' })).toBe(true)
  })

  it('Should return true for an empty object (still an indexedFulfilments shape)', () => {
    expect(isNonArrayObject({})).toBe(true)
  })

  it('Should return false for primitive strings', () => {
    expect(isNonArrayObject('a')).toBe(false)
    expect(isNonArrayObject('')).toBe(false)
  })

  it('Should return false for other primitives', () => {
    expect(isNonArrayObject(0)).toBe(false)
    expect(isNonArrayObject(false)).toBe(false)
    expect(isNonArrayObject(true)).toBe(false)
  })

  it('Should return false for undefined', () => {
    expect(isNonArrayObject(undefined)).toBe(false)
  })

  it('Should return false for null', () => {
    expect(isNonArrayObject(null)).toBe(false)
  })

  it('Should return false for arrays', () => {
    expect(isNonArrayObject([])).toBe(false)
    expect(isNonArrayObject(['a', 'b'])).toBe(false)
  })
})

describe('readGate', () => {
  const gateId = 'gate-id'

  it('Should return { present: false, candidates: [] } when nothing is stored', () => {
    expect(readGate({}, gateId)).toEqual({ present: false, candidates: [] })
  })

  it('Should return { present: false, candidates: [] } for undefined stored value', () => {
    expect(readGate(undefinedValueEntry(gateId), gateId)).toEqual({
      present: false,
      candidates: []
    })
  })

  it('Should wrap a primitive string in a single-element candidates array', () => {
    expect(readGate({ [gateId]: 'yes' }, gateId)).toEqual({
      present: true,
      candidates: ['yes']
    })
  })

  it('Should wrap other primitives (0, false, empty string) as present', () => {
    expect(readGate({ [gateId]: 0 }, gateId)).toEqual({
      present: true,
      candidates: [0]
    })
    expect(readGate({ [gateId]: false }, gateId)).toEqual({
      present: true,
      candidates: [false]
    })
    expect(readGate({ [gateId]: '' }, gateId)).toEqual({
      present: true,
      candidates: ['']
    })
  })

  it('Should treat null as a primitive (present with a single null candidate)', () => {
    expect(readGate({ [gateId]: null }, gateId)).toEqual({
      present: true,
      candidates: [null]
    })
  })

  it('Should project an indexedFulfilments map to its values as candidates', () => {
    expect(readGate({ [gateId]: { line1: 'a', line2: 'b' } }, gateId)).toEqual({
      present: true,
      candidates: ['a', 'b']
    })
  })

  it('Should return present:true with empty candidates for empty indexedFulfilments', () => {
    expect(readGate({ [gateId]: {} }, gateId)).toEqual({
      present: true,
      candidates: []
    })
  })

  it('Should treat arrays as primitives (single-element candidates wrapping the array)', () => {
    const fulfilment = ['a', 'b']
    expect(readGate({ [gateId]: fulfilment }, gateId)).toEqual({
      present: true,
      candidates: [fulfilment]
    })
  })
})
