import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  containerApplies,
  createFlowConditionRegistry,
  journeyFlowConditions
} from './applies-when.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../model/flow.json'), 'utf8')
)

const obligationEntry = (name, overrides = {}) => [
  name,
  {
    name,
    inScope: true,
    status: 'optional',
    reasons: [],
    fulfilled: false,
    ...overrides
  }
]

const evaluationOf = (entries, fulfilments = {}) => ({
  obligations: Object.fromEntries(entries),
  fulfilments,
  drops: []
})

describe('flow-eval/applies-when — registry mechanics', () => {
  it('resolves defined names and parameterised families', () => {
    const registry = createFlowConditionRegistry()
    registry.define(
      'keepsBees',
      ({ fulfilments }) => fulfilments.bees?.value === 'yes'
    )
    registry.defineFamily(
      'plotIs',
      (size) =>
        ({ fulfilments }) =>
          fulfilments.plot?.value === size
    )
    const evaluation = evaluationOf([], {
      bees: { value: 'yes' },
      plot: { value: 'half' }
    })
    expect(registry.resolve('keepsBees')(evaluation)).toBe(true)
    expect(registry.resolve('plotIs:half')(evaluation)).toBe(true)
    expect(registry.resolve('plotIs:full')(evaluation)).toBe(false)
  })

  it('throws loudly on unknown names and unknown family prefixes', () => {
    const registry = createFlowConditionRegistry()
    expect(() => registry.resolve('ghost')).toThrow(
      'Unknown appliesWhen condition "ghost"'
    )
    expect(() => registry.resolve('ghost:arg')).toThrow(
      'Unknown appliesWhen condition "ghost:arg"'
    )
  })
})

describe('flow-eval/applies-when — containerApplies', () => {
  const registry = createFlowConditionRegistry()
  registry.define(
    'keepsBees',
    ({ fulfilments }) => fulfilments.bees?.value === 'yes'
  )

  it('always applies without an appliesWhen name (Flow root included)', () => {
    expect(containerApplies({ sections: [] }, evaluationOf([]))).toBe(true)
    expect(containerApplies({ kind: 'page', id: 'p' }, evaluationOf([]))).toBe(
      true
    )
  })

  it('gates through the injected registry seam', () => {
    const gated = {
      kind: 'group',
      id: 'hives',
      appliesWhen: 'keepsBees',
      children: []
    }
    expect(containerApplies(gated, evaluationOf([]), registry)).toBe(false)
    expect(
      containerApplies(
        gated,
        evaluationOf([], { bees: { value: 'yes' } }),
        registry
      )
    ).toBe(true)
  })

  it('throws on a name the registry does not know', () => {
    const gated = { kind: 'page', id: 'p', appliesWhen: 'ghost' }
    expect(() => containerApplies(gated, evaluationOf([]), registry)).toThrow(
      'Unknown appliesWhen condition "ghost"'
    )
  })
})

describe('flow-eval/applies-when — the journey conditions', () => {
  it('hadClaimsIsYes reads the stored answer through the name view', () => {
    const yes = evaluationOf([obligationEntry('hadClaims')], {
      hadClaims: { value: 'yes' }
    })
    const no = evaluationOf([obligationEntry('hadClaims')], {
      hadClaims: { value: 'no' }
    })
    expect(journeyFlowConditions.resolve('hadClaimsIsYes')(yes)).toBe(true)
    expect(journeyFlowConditions.resolve('hadClaimsIsYes')(no)).toBe(false)
  })

  it('addonSelected:* checks membership of the addons answer array', () => {
    const evaluation = evaluationOf([obligationEntry('addons')], {
      addons: { value: ['named-driver'] }
    })
    const applies = journeyFlowConditions.resolve('addonSelected:named-driver')
    const doesNot = journeyFlowConditions.resolve('addonSelected:protected-ncd')
    expect(applies(evaluation)).toBe(true)
    expect(doesNot(evaluation)).toBe(false)
    expect(applies(evaluationOf([obligationEntry('addons')]))).toBe(false)
  })

  it('quoteReady fires iff every in-scope engine-mandatory obligation is fulfilled', () => {
    const blocked = evaluationOf([
      obligationEntry('email', { status: 'mandatory', fulfilled: true }),
      obligationEntry('coverType', { status: 'mandatory', fulfilled: false }),
      obligationEntry('phone')
    ])
    const ready = evaluationOf([
      obligationEntry('email', { status: 'mandatory', fulfilled: true }),
      obligationEntry('coverType', { status: 'mandatory', fulfilled: true }),
      obligationEntry('phone'),
      obligationEntry('excessAmount', { inScope: false, status: undefined })
    ])
    const quoteReady = journeyFlowConditions.resolve('quoteReady')
    expect(quoteReady(blocked)).toBe(false)
    expect(quoteReady(ready)).toBe(true)
  })
})

describe('flow-eval/applies-when — closed name list against model/flow.json', () => {
  const collectNames = (containers) =>
    containers.flatMap((container) => [
      ...(container.appliesWhen ? [container.appliesWhen] : []),
      ...(container.kind === 'group' ? collectNames(container.children) : [])
    ])
  const names = new Set(collectNames(flow.sections))

  it('resolves every appliesWhen name the polished Flow declares', () => {
    expect(names.size).toBeGreaterThan(0)
    for (const name of names) {
      expect(() => journeyFlowConditions.resolve(name)).not.toThrow()
    }
  })
})
