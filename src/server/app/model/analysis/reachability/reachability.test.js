import { describe, it, expect } from 'vitest'
import {
  proveReachability,
  proveWithWitnesses,
  synthesiseWitness,
  WITNESS_KIND
} from './index.js'
import { obligationSet } from '../../obligations/manifest.js'
import {
  obligationMetadata,
  allowListed,
  allowListedPairs,
  alwaysInScope,
  anyAllowListed,
  anyNotInUnionOf,
  branchedGate,
  equalsGate,
  includesGate,
  matches,
  notInUnionOf,
  presentGate
} from '../../obligations/helpers/index.js'

const { obligations } = obligationSet()

const record = (id, dependsOn) => ({ id, dependsOn })

const ROOT_UNREACHABLE_ID = 'root-unreachable'
const SELF_LOOP_ID = 'acc-doc-type'

const manifestRecords = () =>
  obligations.map((obligation) => {
    if (typeof obligation.applyTo === 'function') {
      return {
        id: obligation.id,
        dependsOn: obligationMetadata(obligation).dependsOn
      }
    }
    return { id: obligation.id, dependsOn: [] }
  })

describe('#proveReachability — trivial cases', () => {
  it('Should classify an obligation with dependsOn: [] as reachable', () => {
    const result = proveReachability([record('countryOfOrigin', [])])
    expect(result.reachable).toContain('countryOfOrigin')
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
  })

  it('Should classify an obligation whose dependsOn hits an always-in-scope gate as reachable', () => {
    const result = proveReachability([
      record('gate', []),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['gate', 'gated']))
    expect(result.unreachable).toEqual([])
  })

  it('Should handle a chain of transitive dependencies', () => {
    const result = proveReachability([
      record('A', []),
      record('B', ['A']),
      record('C', ['B'])
    ])
    expect(result.reachable).toEqual(expect.arrayContaining(['A', 'B', 'C']))
    expect(result.unreachable).toEqual([])
  })
})

describe('#proveReachability — unreachable detection', () => {
  it('Should flag an obligation whose dependency chain has no always-in-scope root', () => {
    const result = proveReachability([
      record('gate', ['gated']),
      record('gated', ['gate'])
    ])
    expect(result.reachable).toEqual([])
    expect(result.unreachable).toEqual(
      expect.arrayContaining(['gate', 'gated'])
    )
  })

  it('Should flag an obligation whose transitive chain hits a floating id', () => {
    const result = proveReachability([
      record(ROOT_UNREACHABLE_ID, ['nowhere']),
      record('downstream', [ROOT_UNREACHABLE_ID]),
      record('seed', [])
    ])
    expect(result.reachable).toContain('seed')
    expect(result.errors.map((error) => error.obligationId)).toContain(
      ROOT_UNREACHABLE_ID
    )
  })
})

describe('#proveReachability — real manifest', () => {
  it('Should report ZERO unreachable obligations', () => {
    const result = proveReachability(manifestRecords())
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
  })
})

describe('#proveReachability — self-loop handling', () => {
  it('Should not recurse forever on a self-referencing dependsOn', () => {
    const result = proveReachability([record(SELF_LOOP_ID, [SELF_LOOP_ID])])
    expect(result.errors).toEqual([])
    expect(result.reachable).toContain(SELF_LOOP_ID)
    expect(result.unreachable).not.toContain(SELF_LOOP_ID)
  })

  it('Should have zero unreachable and no errors for the full manifest', () => {
    const result = proveReachability(manifestRecords())
    expect(result).toBeDefined()
    expect(result.errors).toEqual([])
    expect(result.unreachable).toEqual([])
  })
})

describe('#proveReachability — defensive against dangling ids', () => {
  it('Should report a dangling dependsOn id as an error (does not crash)', () => {
    const result = proveReachability([
      record('seed', []),
      record('dangler', ['id-that-does-not-exist'])
    ])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({
      obligationId: 'dangler',
      reason: expect.stringContaining('unknown')
    })
    expect(result.reachable).toContain('seed')
  })
})

const codeObligation = { id: 'code-obligation' }
const booleanObligation = { id: 'bool-obligation' }

describe('#synthesiseWitness — per-helper metadata inversion', () => {
  it('Should return the first allowlist entry as witness for allowListed', () => {
    const gate = allowListed(codeObligation, ['a', 'b', 'c'])
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObligation.id,
      value: 'a',
      gatedParentGroupId: null
    })
    const decision = obligation.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should return the first pair as witness for allowListedPairs', () => {
    const speciesObligation = { id: 'species-obligation' }
    const gate = allowListedPairs(codeObligation, speciesObligation, [
      ['01061900', 'Felis catus'],
      ['0102', 'Bos taurus']
    ])
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObligation.id,
      pairedObligationId: speciesObligation.id,
      value: ['01061900', 'Felis catus'],
      gatedParentGroupId: null
    })
    const decision = obligation.applyTo(
      {
        [witness.obligationId]: { line1: witness.value[0] },
        [witness.pairedObligationId]: { line1: witness.value[1] }
      },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the gatedParentGroupId when allowListed has a gatedParentGroup', () => {
    const groupObligation = { id: 'group-obligation' }
    const gate = allowListed(codeObligation, ['a'], groupObligation)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObligation.id,
      value: 'a',
      gatedParentGroupId: groupObligation.id
    })
  })

  it('Should return the first allowlist entry as witness for anyAllowListed', () => {
    const gate = anyAllowListed(
      codeObligation,
      ['x', 'y'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObligation.id,
      value: 'x',
      gatedParentGroupId: null
    })
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should return a value outside the union as witness for anyNotInUnionOf', () => {
    const gate = anyNotInUnionOf(
      codeObligation,
      ['0101', '01061900'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: codeObligation.id,
      value: '__witness_not_in_union__',
      gatedParentGroupId: null
    })
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should return metadata.value as witness for matches', () => {
    const gate = matches(booleanObligation, 'yes')
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: booleanObligation.id,
      value: 'yes'
    })
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should return trivial for a TOTAL branchedGate (both branches in-scope)', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })
})

describe('#synthesiseWitness — branchedGate and notInUnionOf', () => {
  it('Should synthesise a witness that opens the gate for branchedGate with predicateMeta.equals', () => {
    const gate = branchedGate(
      (answers) => answers[booleanObligation.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      {
        operator: 'equals',
        obligationId: booleanObligation.id,
        value: 'yes'
      }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: booleanObligation.id,
      value: 'yes'
    })
    const decision = obligation.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should fire the closure with a witness for branchedGate with predicateMeta.includes', () => {
    const gate = branchedGate(
      (answers) => ['a', 'b'].includes(answers[codeObligation.id]),
      { inScope: true, status: 'optional' },
      { inScope: false },
      {
        operator: 'includes',
        obligationId: codeObligation.id,
        values: ['a', 'b']
      }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObligation.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obligation.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should return opaque for a non-total branchedGate WITHOUT predicateMeta', () => {
    const gate = branchedGate(
      () => true,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.OPAQUE)
    expect(witness.reason).toContain('predicateMeta')
  })

  it('Should return a value NOT in the derived union as witness for notInUnionOf', () => {
    const gate = notInUnionOf(codeObligation, [
      ['a', 'b'],
      ['c', 'd']
    ])
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObligation.id)
    expect(['a', 'b', 'c', 'd']).not.toContain(witness.value)
    const decision = obligation.applyTo(
      { [witness.obligationId]: { k1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should carry the gatedParentGroupId when notInUnionOf has a gatedParentGroup', () => {
    const groupObligation = { id: 'group-obligation' }
    const gate = notInUnionOf(codeObligation, [['a']], groupObligation)
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObligation.id)
    expect(witness.gatedParentGroupId).toBe(groupObligation.id)
    expect(['a']).not.toContain(witness.value)
  })

  it('Should return trivial for an obligation without applyTo (structural group)', () => {
    const witness = synthesiseWitness({ id: 'commodityLine' })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should return trivial for an always-in-scope bare closure (no .metadata)', () => {
    const witness = synthesiseWitness({
      id: 'always',
      applyTo: () => ({ inScope: true, status: 'mandatory' })
    })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should return opaque for a gate type it has no synthesiser for', () => {
    const applyTo = () => ({ inScope: true })
    applyTo.metadata = { gateType: 'toString' }
    const witness = synthesiseWitness({ id: 'gated', applyTo })
    expect(witness).toEqual({
      kind: WITNESS_KIND.OPAQUE,
      reason: "unrecognised helper metadata gateType 'toString'"
    })
  })
})

describe('#synthesiseWitness — meta-first gate helpers', () => {
  it('Should synthesise a witness that opens the real closure for equalsGate (purge-on-flip)', () => {
    const gate = equalsGate(
      booleanObligation,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({
      kind: WITNESS_KIND.WITNESS,
      obligationId: booleanObligation.id,
      value: 'yes'
    })
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify equalsGate (total — regionCode shape) as trivial', () => {
    const gate = equalsGate(
      booleanObligation,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for presentGate (purge-on-flip)', () => {
    const gate = presentGate(
      booleanObligation,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(booleanObligation.id)
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify presentGate (total) as trivial', () => {
    const gate = presentGate(
      booleanObligation,
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should synthesise a witness that opens the real closure for includesGate (purge-on-flip)', () => {
    const gate = includesGate(
      codeObligation,
      ['a', 'b'],
      { inScope: true, status: 'optional' },
      { inScope: false }
    )
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    expect(witness.obligationId).toBe(codeObligation.id)
    expect(['a', 'b']).toContain(witness.value)
    const decision = obligation.applyTo({
      [witness.obligationId]: witness.value
    })
    expect(decision.inScope).toBe(true)
  })

  it('Should classify includesGate (total) as trivial', () => {
    const gate = includesGate(
      codeObligation,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: true, status: 'optional' }
    )
    const witness = synthesiseWitness({ id: 'gated', applyTo: gate })
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
  })

  it('Should classify alwaysInScope as trivial (no read; gate always open)', () => {
    const gate = alwaysInScope('mandatory')
    const obligation = { id: 'gated', applyTo: gate }
    const witness = synthesiseWitness(obligation)
    expect(witness).toEqual({ kind: WITNESS_KIND.TRIVIAL })
    expect(obligation.applyTo({})).toEqual({
      inScope: true,
      status: 'mandatory'
    })
  })
})

describe('#synthesiseWitness — real manifest fidelity', () => {
  it('Should classify regionCode (status-swap equalsGate) as trivial — both branches in scope', () => {
    const regionCode = obligations.find(
      (obligation) => obligation.name === 'regionOfOriginCode'
    )
    const witness = synthesiseWitness(regionCode)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    const decision = regionCode.applyTo(
      { [regionCode.applyTo.metadata.obligationId]: 'yes' },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with a witness for purposeInInternalMarket (non-total branchedGate)', () => {
    const purposeInInternalMarket = obligations.find(
      (obligation) => obligation.name === 'purposeInInternalMarket'
    )
    const witness = synthesiseWitness(purposeInInternalMarket)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = purposeInInternalMarket.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe('mandatory')
  })

  it('Should open the closure with an includes-shape witness for transitedCountries', () => {
    const transitedCountries = obligations.find(
      (obligation) => obligation.name === 'transitedCountries'
    )
    const witness = synthesiseWitness(transitedCountries)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = transitedCountries.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the closure with a commodity-code witness for numberOfPackages (allowListed)', () => {
    const numberOfPackages = obligations.find(
      (obligation) => obligation.name === 'numberOfPackages'
    )
    const witness = synthesiseWitness(numberOfPackages)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = numberOfPackages.applyTo(
      { [witness.obligationId]: { line1: witness.value } },
      new Map()
    )
    expect(decision.inScope).toBe(true)
  })

  it('Should open the cph closure with a not-in-union witness', () => {
    const cph = obligations.find(
      (obligation) => obligation.name === 'countyParishHoldingCph'
    )
    expect(cph.applyTo.metadata.gateType).toBe('anyNotInUnionOf')
    const witness = synthesiseWitness(cph)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = cph.applyTo({
      [witness.obligationId]: { line1: witness.value }
    })
    expect(decision.inScope).toBe(true)
  })
})

describe('#proveWithWitnesses — real manifest classification', () => {
  it('Should report no unreachable obligation or error and classify every obligation', () => {
    const result = proveWithWitnesses(obligations)
    expect(result.unreachable).toEqual([])
    expect(result.errors).toEqual([])
    const classifiedCount =
      result.witnesses.synthesisable.length +
      result.witnesses.trivial.length +
      result.witnesses.opaque.length
    expect(classifiedCount).toBe(obligations.length)
  })

  it('Should have the expected classification counts (≥14 synthesisable, 0 opaque)', () => {
    const result = proveWithWitnesses(obligations)
    expect(result.witnesses.synthesisable.length).toBeGreaterThanOrEqual(14)
    const synthesisableNames = result.witnesses.synthesisable.map(
      (id) => obligations.find((obligation) => obligation.id === id).name
    )
    expect(synthesisableNames).toContain('animalIdentifierEarTag')
    expect(synthesisableNames).toContain('horseName')
    expect(result.witnesses.opaque).toEqual([])
  })

  it('Should pass every fidelity check (no witness fails to open its own closure)', () => {
    const result = proveWithWitnesses(obligations)
    expect(
      result.errors.filter((error) => /did not open/.test(error.reason))
    ).toEqual([])
  })
})

describe('meta-first gate sites round-trip', () => {
  const findObligationByName = (name) =>
    obligations.find((obligation) => obligation.name === name)

  it.each([
    ['purposeInInternalMarket', 'mandatory'],
    ['commercialTransporter', 'mandatory'],
    ['privateTransporter', 'mandatory'],
    ['transitedCountries', 'optional']
  ])('%s: witness opens the closure with status=%s', (name, status) => {
    const obligation = findObligationByName(name)
    const witness = synthesiseWitness(obligation)
    expect(witness.kind).toBe(WITNESS_KIND.WITNESS)
    const decision = obligation.applyTo(
      { [witness.obligationId]: witness.value },
      new Map()
    )
    expect(decision.inScope).toBe(true)
    expect(decision.status).toBe(status)
    expect(Array.isArray(decision.reasons)).toBe(true)
    expect(decision.reasons.length).toBeGreaterThan(0)
  })

  it('regionCode: matching value → mandatory + reason, non-matching → optional in scope', () => {
    const regionOfOriginCode = findObligationByName('regionOfOriginCode')
    const witness = synthesiseWitness(regionOfOriginCode)
    expect(witness.kind).toBe(WITNESS_KIND.TRIVIAL)
    const regionCodeRequirement = findObligationByName(
      'regionOfOriginCodeRequirement'
    )
    const mandatoryDecision = regionOfOriginCode.applyTo(
      { [regionCodeRequirement.id]: 'yes' },
      new Map()
    )
    expect(mandatoryDecision).toMatchObject({
      inScope: true,
      status: 'mandatory'
    })
    expect(mandatoryDecision.reasons).toBeDefined()
    expect(mandatoryDecision.reasons.length).toBeGreaterThan(0)
    const optionalDecision = regionOfOriginCode.applyTo(
      { [regionCodeRequirement.id]: 'no' },
      new Map()
    )
    expect(optionalDecision).toEqual({ inScope: true, status: 'optional' })
  })

  it.each([
    'accompanyingDocumentType',
    'accompanyingDocumentAttachmentType',
    'accompanyingDocumentReference',
    'accompanyingDocumentDateOfIssue'
  ])('%s is a plain mandatory document field (no applyTo)', (name) => {
    const field = findObligationByName(name)
    expect(field.applyTo).toBeUndefined()
    expect(field.status).toBe('mandatory')
    expect(synthesiseWitness(field).kind).toBe(WITNESS_KIND.TRIVIAL)
  })

  it('Should use a meta-first gateType for every listed site', () => {
    const META_FIRST = new Set(['equalsGate', 'presentGate', 'includesGate'])
    const metaFirstSiteNames = [
      'purposeInInternalMarket',
      'commercialTransporter',
      'privateTransporter',
      'transitedCountries',
      'regionOfOriginCode',
      'destinationCountry',
      'portOfExit',
      'exitDate'
    ]
    const stragglers = metaFirstSiteNames
      .map(findObligationByName)
      .filter(
        (obligation) => !META_FIRST.has(obligation.applyTo?.metadata?.gateType)
      )
      .map(
        (obligation) =>
          `${obligation.name} → ${obligation.applyTo?.metadata?.gateType}`
      )
    expect(stragglers).toEqual([])
  })
})

describe('#proveReachability — graph-level pass over the real manifest', () => {
  it('Should keep numberOfPackages reachable in the graph-only pass', () => {
    const result = proveReachability(manifestRecords())
    const numberOfPackages = obligations.find(
      (obligation) => obligation.name === 'numberOfPackages'
    )
    expect(result.reachable).toContain(numberOfPackages.id)
  })
})
