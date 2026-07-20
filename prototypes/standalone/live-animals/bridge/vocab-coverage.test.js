import { describe, it, expect } from 'vitest'
import { obligations } from '../model/obligations/obligations.js'
import { answersToFulfilments, ancestorChain } from './fulfilments.js'
import * as importReasonPurpose from '../services/import-reason-purpose/index.js'
import * as transportReference from '../services/transport-reference/index.js'
import * as commodities from '../services/commodities/index.js'

// The A→B vocabulary loop, closed: stored answers hold the MDM services'
// vocabulary ('internalMarket', 'Road Vehicle', 'Cow'), the manifest's gates
// compare the model's vocabulary ('internal-market', 'road-vehicle', CN
// codes), and the bridge converts by convention (camel/title→kebab,
// commodityCodeFor). A service value that stops mapping onto the gate
// constant it targets makes the gate silently never fire — these tests turn
// that into a loud failure.
//
// Gate constants are DERIVED from each applyTo helper's metadata sidecar
// (not hand-copied), so a new gate lands inside the assertion automatically.
// Every constant is pushed through the bridge's REAL path
// (`answersToFulfilments`), never a re-implementation of its transforms.

const byUuid = new Map(obligations.map((o) => [o.id, o]))

// Which helper metadata shapes carry comparison constants, and where.
const GATE_CONSTANTS = {
  equalsGate: (meta) => [meta.value],
  matches: (meta) => [meta.value],
  includesGate: (meta) => meta.values,
  allowListed: (meta) => meta.values,
  anyAllowListed: (meta) => meta.values,
  notInUnionOf: (meta) => meta.values
}

// One entry per constant-bearing gate on the manifest:
// { gated, gate (the obligation whose stored value is read), constants }.
const gateEntries = () =>
  obligations.flatMap((o) => {
    const meta = o.applyTo?.metadata
    const constantsOf = meta && GATE_CONSTANTS[meta.type]
    if (!constantsOf) return []
    return [
      {
        gated: o.name,
        gate: byUuid.get(meta.obligation),
        constants: constantsOf(meta)
      }
    ]
  })

// The A-vocab source per gate field — the same accessors the pages render
// and validate from. `regionOfOriginCodeRequirement` has no MDM service;
// its options are the controller-owned yes/no pair (features/origin).
const SOURCE_VALUES = {
  reasonForImport: () => importReasonPurpose.reasons().map((o) => o.value),
  transporterType: () => transportReference.transporterTypes(),
  meansOfTransport: () => transportReference.meansOfTransport(),
  regionOfOriginCodeRequirement: () => ['yes', 'no'],
  commoditySelection: () => commodities.list()
}

// Nested answers placing `value` on the gate field, per its group chain
// (`commoditySelection` → { commodityLines: [{ commoditySelection: value }] }).
const answersFor = (gate, value) =>
  ancestorChain(gate).reduceRight(
    (inner, group) => ({ [group.name]: [inner] }),
    {
      [gate.name]: value
    }
  )

// The B-vocab image of the gate field's current source values, through the
// bridge. Grouped gate fields store records-maps; scalars store directly.
const bridgedImage = (gate) => {
  const grouped = ancestorChain(gate).length > 0
  return new Set(
    SOURCE_VALUES[gate.name]().map((value) => {
      const stored = answersToFulfilments(answersFor(gate, value))[gate.id]
      return grouped ? Object.values(stored)[0] : stored
    })
  )
}

// Constants of an entry no current source value bridges onto.
const unreachableConstants = (entry) => {
  const image = bridgedImage(entry.gate)
  return entry.constants.filter((constant) => !image.has(constant))
}

// A grouped-gate entry is triggerable while ≥ 1 of its constants is
// reachable — commodity allowlists are wider than the stub commodity list
// by design (MDM ships the full list in production), so per-code coverage
// would fail on stub narrowness rather than on drift.
const isTriggerable = (entry) =>
  unreachableConstants(entry).length < entry.constants.length

const isScalarGate = (entry) => ancestorChain(entry.gate).length === 0

describe('vocab coverage — manifest gate constants vs MDM sources', () => {
  it('Should have an A-vocab source for every gate field the manifest compares against', () => {
    const unmapped = gateEntries()
      .map((entry) => entry.gate.name)
      .filter((name) => !(name in SOURCE_VALUES))
    expect(unmapped).toEqual([])
  })

  it('Should bridge every scalar gate constant from a current source value', () => {
    const failures = gateEntries()
      .filter(isScalarGate)
      .map((entry) => ({
        gated: entry.gated,
        gate: entry.gate.name,
        unreachable: unreachableConstants(entry)
      }))
      .filter((failure) => failure.unreachable.length > 0)
    expect(failures).toEqual([])
  })

  it('Should keep every commodity-gated rule triggerable from the current commodity list', () => {
    const dead = gateEntries()
      .filter((entry) => !isScalarGate(entry))
      .filter((entry) => !isTriggerable(entry))
      .map((entry) => ({ gated: entry.gated, constants: entry.constants }))
    expect(dead).toEqual([])
  })

  it('Should have teeth — a constant no source value reaches is reported', () => {
    const reasonGate = gateEntries().find(
      (entry) => entry.gate.name === 'reasonForImport'
    ).gate
    expect(
      unreachableConstants({
        gated: 'synthetic',
        gate: reasonGate,
        constants: ['no-such-reason', 'internal-market']
      })
    ).toEqual(['no-such-reason'])
  })

  it('Should have teeth — a commodity gate with no reachable code is dead', () => {
    const commodityGate = gateEntries().find(
      (entry) => entry.gate.name === 'commoditySelection'
    ).gate
    expect(
      isTriggerable({
        gated: 'synthetic',
        gate: commodityGate,
        constants: ['9999', '8888']
      })
    ).toBe(false)
  })
})
