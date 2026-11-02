import { describe, it, expect } from 'vitest'
import {
  STRUCTURED_HELPER_TYPES,
  OPAQUE_HELPER_TYPES,
  SYNTHESISED_GATE_TYPES,
  WITNESS_KIND,
  synthesiseWitness
} from './reachability/index.js'
import * as helpers from '../obligations/helpers/index.js'

const gateObligation = { id: 'gate-obligation' }

const SAMPLE_OBLIGATIONS = {
  allowListed: {
    id: 'sample-allowListed',
    applyTo: helpers.allowListed(gateObligation, ['a', 'b'])
  },
  allowListedPairs: {
    id: 'sample-allowListedPairs',
    applyTo: helpers.allowListedPairs(gateObligation, { id: 'paired-obl' }, [
      ['a', 'b']
    ])
  },
  anyAllowListed: {
    id: 'sample-anyAllowListed',
    applyTo: helpers.anyAllowListed(
      gateObligation,
      ['x'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  anyNotInUnionOf: {
    id: 'sample-anyNotInUnionOf',
    applyTo: helpers.anyNotInUnionOf(
      gateObligation,
      ['x'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  matches: {
    id: 'sample-matches',
    applyTo: helpers.matches(gateObligation, 'yes')
  },
  branchedGate: {
    id: 'sample-branchedGate',
    applyTo: helpers.branchedGate(
      (answers) => answers[gateObligation.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      { operator: 'equals', obligationId: gateObligation.id, value: 'yes' }
    )
  },
  notInUnionOf: {
    id: 'sample-notInUnionOf',
    applyTo: helpers.notInUnionOf(gateObligation, [
      ['a', 'b'],
      ['c', 'd']
    ])
  },
  equalsGate: {
    id: 'sample-equalsGate',
    applyTo: helpers.equalsGate(
      gateObligation,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  presentGate: {
    id: 'sample-presentGate',
    applyTo: helpers.presentGate(
      gateObligation,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  includesGate: {
    id: 'sample-includesGate',
    applyTo: helpers.includesGate(
      gateObligation,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  alwaysInScope: {
    id: 'sample-alwaysInScope',
    applyTo: helpers.alwaysInScope('mandatory')
  }
}

describe('coverage — helper classification sets are exported and disjoint', () => {
  it('Should export STRUCTURED_HELPER_TYPES as a non-empty Set', () => {
    expect(STRUCTURED_HELPER_TYPES).toBeInstanceOf(Set)
    expect(STRUCTURED_HELPER_TYPES.size).toBeGreaterThan(0)
  })

  it('Should export OPAQUE_HELPER_TYPES as a Set', () => {
    expect(OPAQUE_HELPER_TYPES).toBeInstanceOf(Set)
  })

  it('Should keep STRUCTURED and OPAQUE helper-type sets disjoint', () => {
    const overlap = [...STRUCTURED_HELPER_TYPES].filter((gateType) =>
      OPAQUE_HELPER_TYPES.has(gateType)
    )
    expect(overlap).toEqual([])
  })
})

describe('coverage — the witness synthesisers match the declared sets', () => {
  it('Should classify every synthesised gate type as STRUCTURED or OPAQUE', () => {
    const unclassified = [...SYNTHESISED_GATE_TYPES].filter(
      (gateType) =>
        !STRUCTURED_HELPER_TYPES.has(gateType) &&
        !OPAQUE_HELPER_TYPES.has(gateType)
    )
    expect(unclassified).toEqual([])
  })

  it('Should have a synthesiser for every STRUCTURED helper type', () => {
    const missingSynthesiser = [...STRUCTURED_HELPER_TYPES].filter(
      (gateType) => !SYNTHESISED_GATE_TYPES.has(gateType)
    )
    expect(missingSynthesiser).toEqual([])
  })

  it('Should have a synthesiser for every OPAQUE helper type', () => {
    const missingSynthesiser = [...OPAQUE_HELPER_TYPES].filter(
      (gateType) => !SYNTHESISED_GATE_TYPES.has(gateType)
    )
    expect(missingSynthesiser).toEqual([])
  })
})

describe('coverage — every helper export classifies as STRUCTURED or OPAQUE', () => {
  const helperExports = Object.entries(helpers).filter(
    ([, helperExport]) => typeof helperExport === 'function'
  )

  const NON_GATE_HELPERS = new Set([
    'present',
    'obligationMetadata',
    'moreThanOne'
  ])

  const classificationProblemFor = (name) => {
    const sample = SAMPLE_OBLIGATIONS[name]
    if (!sample) {
      return `helper '${name}' — no sample in SAMPLE_OBLIGATIONS; add one and register the helper type in STRUCTURED_HELPER_TYPES or OPAQUE_HELPER_TYPES`
    }
    const gateType = sample.applyTo?.metadata?.gateType
    if (!gateType) {
      return `helper '${name}' — sample.applyTo.metadata.gateType missing; helper must attach a metadata.gateType or be added to NON_GATE_HELPERS`
    }
    if (
      !STRUCTURED_HELPER_TYPES.has(gateType) &&
      !OPAQUE_HELPER_TYPES.has(gateType)
    ) {
      return `helper '${name}' — metadata.gateType '${gateType}' is not in STRUCTURED_HELPER_TYPES or OPAQUE_HELPER_TYPES; add it to one of the sets in analysis/reachability/witness/kinds.js`
    }
    return null
  }

  it('Should classify every helper export whose gate carries .metadata.gateType', () => {
    const unclassified = helperExports
      .map(([name]) => name)
      .filter((name) => !NON_GATE_HELPERS.has(name))
      .map(classificationProblemFor)
      .filter((problem) => problem !== null)
    expect(unclassified).toEqual([])
  })
})

describe('coverage — synthesiseWitness classifies each helper sample as declared', () => {
  it('Should synthesise every STRUCTURED helper type as a WITNESS or TRIVIAL kind', () => {
    for (const gateType of STRUCTURED_HELPER_TYPES) {
      const sample = Object.values(SAMPLE_OBLIGATIONS).find(
        (candidate) => candidate.applyTo?.metadata?.gateType === gateType
      )
      expect(
        sample,
        `no SAMPLE_OBLIGATIONS entry produces metadata.gateType='${gateType}' — add one so this invariant can prove the STRUCTURED classification is honest`
      ).toBeDefined()
      const witness = synthesiseWitness(sample)
      expect(
        [WITNESS_KIND.WITNESS, WITNESS_KIND.TRIVIAL],
        `STRUCTURED helper type '${gateType}' synthesised as '${witness.kind}' — a structured helper must be witness-synthesisable or trivially open, never opaque`
      ).toContain(witness.kind)
    }
  })

  it('Should synthesise every OPAQUE helper type to WITNESS_KIND.OPAQUE', () => {
    for (const gateType of OPAQUE_HELPER_TYPES) {
      const sample = Object.values(SAMPLE_OBLIGATIONS).find(
        (candidate) => candidate.applyTo?.metadata?.gateType === gateType
      )
      expect(
        sample,
        `no SAMPLE_OBLIGATIONS entry produces metadata.gateType='${gateType}' — add one`
      ).toBeDefined()
      const witness = synthesiseWitness(sample)
      expect(witness.kind).toBe(WITNESS_KIND.OPAQUE)
    }
  })
})
